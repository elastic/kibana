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
  // The investigation flyout's Impact map tab shows it; the chat does not.
  hiddenInConversation: true,
  format: formatImpactMapForAgent,
  describe: () => 'Impact map',
  agentDescription:
    'The investigation impact map is a dependency graph of the entities the problem touches, their relationships, and the critical path from the root cause to the impact.\n\n' +
    'Rules:\n' +
    '- Update it with the `agentic_investigations.set_impact_map` tool, sending the whole map every time.\n' +
    "- The investigation flyout's Impact map tab shows it, not the chat; do not render it inline.",
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
