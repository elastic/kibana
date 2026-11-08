/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { IMPACT_MAP_ATTACHMENT_TYPE } from '../../../common/impact_map/constants';
import {
  investigationImpactMapSchema,
  type InvestigationImpactMap,
} from '../../../common/impact_map/impact_map';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import {
  defineInvestigationAttachment,
  type AssertCanReadConversation,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import {
  impactMapStorageSettings,
  type ImpactMapDocument,
  type ImpactMapStorageSettings,
} from '../storage/impact_map_storage';

/**
 * Text the LLM sees: every entity with its type and annotations, then every relationship. Reads
 * like the map, so the agent can change it without repeating mistakes it can't see.
 */
export const formatImpactMapForAgent = ({
  conversationId,
  title,
  entities,
  relationships,
  entityTypes,
  relationshipTypes,
}: InvestigationImpactMap): string => {
  const entityTypeLabel = new Map(entityTypes.map(({ id, label }) => [id, label]));
  const relationshipLabel = new Map(relationshipTypes.map(({ id, label }) => [id, label]));
  const entityLines = entities.map(
    ({ id, type_id: typeId, label, annotations = {}, metadata = [] }) => {
      const notes = [
        annotations.role,
        annotations.health && `health ${annotations.health}`,
        annotations.impacted && 'impacted',
        annotations.alert_count !== undefined && `${annotations.alert_count} alerts`,
      ].filter(Boolean);
      const facts = metadata.map(({ key, value }) => `${key}=${value}`).join(', ');
      return `- ${label} (id ${id}, ${entityTypeLabel.get(typeId) ?? typeId})${
        notes.length > 0 ? `: ${notes.join(', ')}` : ''
      }${facts ? ` [${facts}]` : ''}`;
    }
  );
  const relationshipLines = relationships.map(
    ({ source_id: source, target_id: target, type_id: typeId, on_critical_path: critical }) =>
      `- ${source} ${relationshipLabel.get(typeId) ?? typeId} ${target}${
        critical ? ' [critical path]' : ''
      }`
  );
  return [
    '## Investigation impact map',
    `Conversation: ${conversationId}`,
    ...(title ? [`Title: ${title}`] : []),
    entities.length > 0 ? ['Entities:', ...entityLines].join('\n') : 'No entities yet.',
    ...(relationships.length > 0 ? [['Relationships:', ...relationshipLines].join('\n')] : []),
  ].join('\n');
};

/**
 * `investigation_impact_map`: the entities a problem touches, how they depend on each other, and
 * the critical path from the root cause to the impact. One document per space and conversation in
 * `.kibana-investigation-impact_map`, replaced as a whole on every write.
 */
export const impactMapAttachment = defineInvestigationAttachment<
  typeof IMPACT_MAP_ATTACHMENT_TYPE,
  ImpactMapStorageSettings,
  ImpactMapDocument
>({
  type: IMPACT_MAP_ATTACHMENT_TYPE,
  storageSettings: impactMapStorageSettings,
  schema: investigationImpactMapSchema,
  format: formatImpactMapForAgent,
  describe: () => 'Impact map',
  agentDescription:
    'The investigation impact map is a dependency graph of the entities the problem touches, their relationships, and the critical path from the root cause to the impact.\n\n' +
    'Rules:\n' +
    '- Update it with the `agentic_investigations.set_impact_map` tool, sending the whole map every time.\n' +
    '- When asked whether the impact has recovered, or how it stands now, first check the latest data, then record it with `agentic_investigations.set_impact_map`: for each customer impact or symptom entity record what is true now: if it recovered, a `recovery` event on that entity (title like "frontend-proxy ingress recovered to 0% failures", since when, the numbers, and a chart that runs to the latest data and marks each mitigation); if it is still failing, a `failure` or `customer_impact` event at the latest time. Do not send the old events again, and set the entity health to healthy when it recovered. Then render the attachment so the cards show it.\n' +
    '- When you tell the user what you found, talk about the events you recorded and link the words that rest on one, as `[words](event:ID)`, where ID is `kind:entity id (or source->target, or investigation):time to the minute in UTC`, for example `[lost every replica](event:condition:frontend:2026-11-08T15:45)`. Link only events you recorded, at most one link per claim.\n' +
    '- The investigation flyout\'s Impact map and Timeline tabs show it. In the chat it is a set of cards (the map and the events that are the impact, such as customer impact or the failures, with what they affect; when none are recorded, the timeline and the key entities) that open the same views; render it when it would help explain your answer (the impact, the root cause, what happened and when, an entity or event), once per answer, with `<render_attachment id="ATTACHMENT_ID" />` on its own line, after a blank line.',
});

/** Registers the readonly investigation_impact_map type with Agent Builder. */
export const registerImpactMapAttachment = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: {
    getDocumentService: () => InvestigationAttachmentDocService<ImpactMapDocument>;
    privileges: InvestigationsPrivilegesChecker;
    assertCanReadConversation: AssertCanReadConversation;
    logger: Logger;
  }
): void => {
  impactMapAttachment.registerAttachmentType(agentBuilder, {
    getService: deps.getDocumentService,
    assertCanRead: (request) => deps.privileges.assertCanRead(request),
    assertCanReadConversation: deps.assertCanReadConversation,
    logger: deps.logger,
  });
};
