/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import { impactSchema, type Impact, type ImpactEntity } from '../../../common/impact/impact';
import {
  defineInvestigationAttachment,
  formatEvidenceForAgent,
} from '../../investigation_attachments';
import {
  impactStorageSettings,
  type ImpactDocument,
  type ImpactStorageSettings,
} from '../storage/impact_storage';

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

const formatEntity = (entity: ImpactEntity): string => {
  const details = [entity.name, entity.type].filter(
    (value): value is string => value !== undefined
  );
  const label = details.length > 0 ? `${entity.id} (${details.join(', ')})` : entity.id;
  return entity.evidence
    ? `- ${label}\n${indent(formatEvidenceForAgent(entity.evidence))}`
    : `- ${label}`;
};

export const formatImpactForAgent = (data: Impact): string => {
  const entities = data.entities ?? [];
  const lines = ['## Investigation impact', `Conversation: ${data.conversationId}`];
  if (data.summary) {
    lines.push(`Summary: ${data.summary}`);
  }
  if (data.evidence) {
    lines.push(`Evidence:\n${indent(formatEvidenceForAgent(data.evidence))}`);
  }
  if (entities.length > 0) {
    lines.push(`Entities:\n${entities.map(formatEntity).join('\n')}`);
  }
  return lines.join('\n');
};

/**
 * `investigation_impact`: one document per space and conversation in
 * `.kibana-investigation-impact`. Origin and attachment id are the document id.
 */
export const impactAttachment = defineInvestigationAttachment<
  typeof IMPACT_ATTACHMENT_TYPE,
  ImpactStorageSettings,
  ImpactDocument
>({
  type: IMPACT_ATTACHMENT_TYPE,
  storageSettings: impactStorageSettings,
  // Impact documents were stored before the factory, under ids without the type.
  legacyUntypedDocumentIds: true,
  schema: impactSchema,
  // The investigation overview shows impact; the chat does not.
  hiddenInConversation: true,
  format: formatImpactForAgent,
  agentDescription:
    'Investigation impact is what an investigation found was affected: a summary, its evidence, and the entities (users, hosts, services) involved.\n\n' +
    'Rules:\n' +
    '- Treat entity ids as opaque; do not invent labels or additional entities.\n' +
    "- The investigation's overview shows the impact, not the chat; do not render it inline.",
});
