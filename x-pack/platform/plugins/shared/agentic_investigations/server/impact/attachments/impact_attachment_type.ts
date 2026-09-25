/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import { impactSchema, type Impact, type ImpactEntity } from '../../../common/impact/impact';

const formatEntity = (entity: ImpactEntity): string => {
  const details = [entity.name, entity.type].filter(
    (value): value is string => value !== undefined
  );
  return details.length > 0 ? `${entity.id} (${details.join(', ')})` : entity.id;
};

const formatImpactForAgent = (data: Impact): string => {
  const lines = [
    '## Investigation impact',
    `Conversation: ${data.conversationId}`,
    `Entities: ${data.entities.map(formatEntity).join(', ')}`,
  ];
  return lines.join('\n');
};

/**
 * Server-side attachment type for investigation impact.
 *
 * `isReadonly: true` prevents the agent from creating or updating these with
 * `attachment_add` / `attachment_update`. Producers persist the Impact document;
 * nothing in this plugin stamps the attachment onto a conversation yet.
 */
export const impactAttachmentType: AttachmentTypeDefinition<typeof IMPACT_ATTACHMENT_TYPE, Impact> =
  {
    id: IMPACT_ATTACHMENT_TYPE,
    isReadonly: true,
    validate: (input) => {
      const result = impactSchema.safeParse(input);
      if (result.success) {
        return { valid: true, data: result.data };
      }
      return { valid: false, error: result.error.message };
    },
    format: (attachment) => ({
      getRepresentation: () => ({
        type: 'text',
        value: formatImpactForAgent(attachment.data),
      }),
    }),
    getAgentDescription: () =>
      'Investigation impact is the set of entities (users, hosts, services) an investigation is about.\n\n' +
      'Rules:\n' +
      '- Treat entity ids as opaque; do not invent labels or additional entities.\n' +
      '- Whenever you mention impact in your response, render it inline with ' +
      '`<render_attachment id="ATTACHMENT_ID" />` (replace ATTACHMENT_ID with the actual id).',
  };
