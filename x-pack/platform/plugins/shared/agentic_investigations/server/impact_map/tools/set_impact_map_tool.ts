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
  MAX_IMPACT_MAP_RELATIONSHIPS,
  SET_IMPACT_MAP_TOOL_ID,
} from '../../../common/impact_map/constants';
import {
  impactMapAnnotationsSchema,
  impactMapEntitySchema,
  impactMapEntityTypesSchema,
  impactMapRelationshipSchema,
  impactMapRelationshipTypesSchema,
} from '../../../common/impact_map/impact_map';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { createInvestigationTool } from '../../investigation_attachments';
import type { ResolveUser } from '../../services/resolve_user';
import type { ImpactMapService } from '../services/impact_map_service';

const entitySchema = impactMapEntitySchema.extend({
  id: impactMapEntitySchema.shape.id.describe(
    'Stable id, unique in this map, used by relationships. Prefer the entity name, e.g. "checkout-service".'
  ),
  type_id: impactMapEntitySchema.shape.type_id.describe(
    'Id of an entity type from the catalog, or from `entity_types` in this call.'
  ),
  label: impactMapEntitySchema.shape.label.describe('The name shown under the node.'),
  annotations: impactMapAnnotationsSchema
    .extend({
      role: impactMapAnnotationsSchema.shape.role.describe(
        '"root_cause" for the confirmed cause (at most one, usually), "symptom" where the problem is seen, "contributor" for what made it worse, "context" for the rest.'
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
  })
);

export type SetImpactMapToolParams = z.infer<typeof setImpactMapToolSchema>;

const DESCRIPTION =
  'Record the impact map of the investigation: a dependency graph of the entities the problem touches, how they relate, and the critical path from what users feel to the root cause. The user sees it in the Impact map tab. ' +
  'This is a snapshot, not a diff: send the whole map every time; it replaces the stored one. ' +
  'Types come from the space catalog so every investigation draws things the same way: read it first with `agentic_investigations.upsert_impact_map_catalog` (no arguments) and reuse its type ids; send any new type in `entity_types` / `relationship_types`. ' +
  'Mark the confirmed cause `role: "root_cause"`, where the problem shows `role: "symptom"`, what users feel `impacted: true`, and every edge of the causal chain `on_critical_path: true`. ' +
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
