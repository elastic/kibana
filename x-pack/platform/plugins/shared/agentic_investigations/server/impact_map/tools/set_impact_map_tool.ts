/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { createOtherResult } from '@kbn/agent-builder-server';
import {
  MAX_IMPACT_MAP_ENTITIES,
  MAX_IMPACT_MAP_EVENTS,
  MAX_IMPACT_MAP_RELATIONSHIPS,
  SET_IMPACT_MAP_TOOL_ID,
} from '../../../common/impact_map/constants';
import {
  impactMapAnnotationsSchema,
  impactMapEntitySchema,
  impactMapEntityTypesSchema,
  impactMapEventSchema,
  impactMapRelationshipSchema,
  impactMapRelationshipTypesSchema,
} from '../../../common/impact_map/impact_map';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { ImpactMapService } from '../services/impact_map_service';

const entitySchema = impactMapEntitySchema.extend({
  id: impactMapEntitySchema.shape.id.describe(
    'Stable id, unique in this map, used by relationships. The bare name of the thing itself, e.g. "checkout-service", never its type, a state or an endpoint.'
  ),
  type_id: impactMapEntitySchema.shape.type_id.describe(
    'Id of an entity type from the catalog, or from `entity_types` in this call.'
  ),
  label: impactMapEntitySchema.shape.label.describe(
    'The bare name of the entity, e.g. "shipping", not "k8s deployment: shipping (0/0)". Its kind is the type; what is wrong with it is an event.'
  ),
  metadata: impactMapEntitySchema.shape.metadata.describe(
    "Facts that help a person understand and find this entity, from tool results only: cloud.provider, cloud.availability_zone, k8s.cluster.name, k8s.namespace.name, host.name, service.version and so on. Reuse the keys the catalog lists (`standard_metadata_fields` and each type's `metadata_fields`); add your own lowercase dotted key, with a `label`, for anything else that helps. Set `featured: true` on the few that matter most (for example cluster and namespace), which show on the first page of the entity's flyout."
  ),
  parent_id: impactMapEntitySchema.shape.parent_id.describe(
    'The id of the entity this one sits inside; the map draws a box around its members, like a Mermaid subgraph. A pod inside its node, a node inside its zone, a zone inside its region, a service inside its business service. Use it for whatever the affected entities share. Must be another entity in this call.'
  ),
  source: impactMapEntitySchema.shape.source.describe(
    'Where you learned the entity exists: log, trace, metric, config, code, catalog, diagram, doc, chat, or inferred. Written-down sources can be stale; prefer telemetry.'
  ),
  confidence: impactMapEntitySchema.shape.confidence.describe(
    'How sure you are that it is real and where you placed it.'
  ),
  annotations: impactMapAnnotationsSchema
    .extend({
      role: impactMapAnnotationsSchema.shape.role.describe(
        '"root_cause" for the confirmed cause (at most one, usually), "contributor" for what made it worse, "context" for the rest.'
      ),
      health: impactMapAnnotationsSchema.shape.health.describe(
        'What the data says about this entity now.'
      ),
      impacted: impactMapAnnotationsSchema.shape.impacted.describe(
        'True when users or the business feel the problem here.'
      ),
      alert_count: impactMapAnnotationsSchema.shape.alert_count.describe(
        'Alerts firing on this entity, drawn as the badge on the node.'
      ),
    })
    .optional(),
});

const relationshipSchema = impactMapRelationshipSchema.extend({
  type_id: impactMapRelationshipSchema.shape.type_id.describe(
    'Id of a relationship type from the catalog, or from `relationship_types` in this call.'
  ),
  source_id: impactMapRelationshipSchema.shape.source_id.describe(
    'The entity the edge starts at: the caller for CALLS, the dependent for DEPENDS_ON.'
  ),
  target_id: impactMapRelationshipSchema.shape.target_id.describe('The entity the edge ends at.'),
  on_critical_path: impactMapRelationshipSchema.shape.on_critical_path.describe(
    'True for every edge on the chain from the impacted entry point to the root cause. Drawn red.'
  ),
  label: impactMapRelationshipSchema.shape.label.describe(
    'Only when the type alone does not say it: the protocol, port or action, such as "HTTPS :443". Replaces the type label on this edge.'
  ),
  source: impactMapRelationshipSchema.shape.source.describe(
    'Where you learned of the link: trace, log, metric, config, code, catalog, diagram, doc, chat, or inferred for a hypothesis (drawn dashed, so say why in the description of the entities it joins).'
  ),
  confidence: impactMapRelationshipSchema.shape.confidence.describe(
    'How sure you are the link is real.'
  ),
});

const eventSchema = impactMapEventSchema.extend({
  id: impactMapEventSchema.shape.id
    .optional()
    .describe('Leave out: an id is derived from the kind, what it happened to and the minute.'),
  kind: impactMapEventSchema.shape.kind.describe(
    '"change" for a deploy, config or scaling change; "failure" for errors, crashes, timeouts; "condition" for a state such as saturation or zero replicas; "alert" for an alert firing; "anomaly" for an anomaly an ML job or detector flagged; "mitigation" for a fix applied; "recovery" for something that was failing and now is not, on the same entity as the failure, with a chart that runs to the latest data and shows the drop; "customer_impact" for what customers felt, on the entry point; "root_cause" for the one thing you found that caused the incident, on the entity it happened to, once you are confident of it; "investigation" for any other finding, such as a hypothesis ruled out; "response" for a responder action such as opening an incident channel.'
  ),
  title: impactMapEventSchema.shape.title.describe(
    'One line, past tense, with the number: "Replicas scaled from 3 to 0".'
  ),
  at: impactMapEventSchema.shape.at.describe('When it happened, ISO 8601.'),
  entity_id: impactMapEventSchema.shape.entity_id.describe(
    'The entity in `entities` it happened to.'
  ),
  relationship_id: impactMapEventSchema.shape.relationship_id.describe(
    'Instead of `entity_id`, the relationship it happened to: its id, or "source_id->target_id". Leave both out only for a finding or a response.'
  ),
  evidence: impactMapEventSchema.shape.evidence.describe(
    'A chart that explains the event in context: its signal over a window that starts before the change that led to it, with annotations at that change and at `at`. Built only from numbers a tool returned.'
  ),
  data_source: impactMapEventSchema.shape.data_source
    .unwrap()
    .describe(
      'Where the data behind the event came from and how it was asked for: the system, the query text and language, and for an API call its method, type, endpoint and payload. Required on every event, with no exception. Never include credentials or auth headers.'
    ),
});

export const setImpactMapToolSchema = lazySchema(() =>
  z.object({
    title: z.string().max(256).optional().describe('A short title for the map.'),
    entities: z
      .array(entitySchema)
      .max(MAX_IMPACT_MAP_ENTITIES)
      .describe(
        'Every entity involved: the impacted entry points, the root cause, and what lies between. Leave out entities that play no part.'
      ),
    relationships: z
      .array(relationshipSchema)
      .max(MAX_IMPACT_MAP_RELATIONSHIPS)
      .describe('How the entities depend on each other. Only between entities in `entities`.'),
    entity_types: impactMapEntityTypesSchema
      .optional()
      .describe(
        'Entity types this map needs that the catalog lacks. They are added to the catalog for later maps.'
      ),
    relationship_types: impactMapRelationshipTypesSchema
      .optional()
      .describe(
        'Relationship types this map needs that the catalog lacks. They are added to the catalog for later maps.'
      ),
    events: z
      .array(eventSchema)
      .max(MAX_IMPACT_MAP_EVENTS)
      .optional()
      .describe(
        'What happened, each against the entity or relationship it happened to. Merged with the events already recorded, so send new or changed ones.'
      ),
  })
);

export type SetImpactMapToolParams = z.infer<typeof setImpactMapToolSchema>;

const DESCRIPTION =
  'Record the impact map of the investigation: a dependency graph of the entities the problem touches, how they relate, and the critical path from what users feel to the root cause. The user sees it in the Impact map tab. ' +
  'The graph is a snapshot, not a diff: send the whole map every time; it replaces the stored one. Events are merged by id. ' +
  'Entities are physical things only (services, hosts, pods, databases, queues, cloud APIs). A change, an outage, a vendor or customer impact is an event on the entity it happened to, never an entity. ' +
  'Types come from the space catalog so every investigation draws things the same way: read it first with `agentic_investigations.upsert_impact_map_catalog` (no arguments) and reuse its type ids; send any new type in `entity_types` / `relationship_types`. ' +
  'Every entity type needs an icon before you draw it: APM `agent_name` when the runtime is known, otherwise pick a specific `eui_icon` (Elasticsearch, Kubernetes, GCP, gear for a controller, compute for an allocator, merge for a proxy — never an empty circle). ' +
  'Draw the architecture of the problem for an on-call engineer who does not know the system: put entities inside what they belong to with `parent_id` (pod in node, node in zone, zone in region, hosts in a network), show owners as team entities with `owned_by` links, and say where each entity and link came from with `source` and `confidence`; a suspected link is `inferred`. Anything a Mermaid diagram can show, this can show; read a diagram with `agentic_investigations.parse_mermaid` first. ' +
  'Mark the confirmed cause `role: "root_cause"`, what the problem touched, where it shows included, `impacted: true`, and every edge of the causal chain `on_critical_path: true`. ' +
  'It does not end the investigation; keep working after calling it.';

export const REMOVED_IMPACT_MAP_ATTACHMENT_NOTE =
  'The user removed the impact map attachment from this conversation. The map was recorded but is not shown in the conversation.';

/** `agentic_investigations.set_impact_map`: the agent's write path for `investigation_impact_map`. */
export const createSetImpactMapTool = ({
  getImpactMapService,
  resolveUser,
  privileges,
  logger,
}: {
  getImpactMapService: () => ImpactMapService;
  resolveUser: ResolveUser;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}) =>
  createInvestigationTool({
    id: SET_IMPACT_MAP_TOOL_ID,
    description: DESCRIPTION,
    schema: setImpactMapToolSchema,
    annotations: {
      title: 'Set Investigation Impact Map',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    assertPrivilege: (request) => privileges.assertCanManage(request),
    logger,
    handler: async (input, { context, conversationId }) => {
      const user = await resolveUser(context.request);
      const { document, attachment, warnings } = await getImpactMapService().setFromTool({
        context,
        conversationId,
        input,
        user,
      });

      const notes = [
        ...warnings,
        ...(attachment === 'removed_by_user' ? [REMOVED_IMPACT_MAP_ATTACHMENT_NOTE] : []),
      ];

      return {
        results: [
          createOtherResult({
            acknowledged: true,
            attachment_id: document.id,
            entities: document.entities.length,
            relationships: document.relationships.length,
            ...(notes.length > 0 && { warning: notes.join(' ') }),
          }),
        ],
      };
    },
  });
