/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import { impactSchema, type Impact } from '../../../common/impact/impact';
import type { ImpactService } from '../services/impact_service';
import { ImpactNotFoundError } from '../services/errors';

const formatImpactForAgent = (data: Impact): string => {
  const lines = [
    '## Investigation impact',
    `Conversation: ${data.conversationId}`,
    `Entities: ${data.entityIds.join(', ')}`,
  ];
  return lines.join('\n');
};

/** Server-side investigation_impact type. Origin is the Impact document id. */
export const createImpactAttachmentType = ({
  getImpactService,
  logger,
}: {
  getImpactService: () => ImpactService;
  logger: Logger;
}): AttachmentTypeDefinition<typeof IMPACT_ATTACHMENT_TYPE, Impact> => ({
  id: IMPACT_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const result = impactSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  resolve: async (origin, context) => {
    try {
      return await getImpactService().get(origin, context.spaceId);
    } catch (error) {
      if (error instanceof ImpactNotFoundError) {
        return undefined;
      }
      logger.warn(`Failed to resolve investigation impact for origin "${origin}": ${error}`);
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    if (!attachment.origin) {
      return false;
    }
    try {
      const current = await getImpactService().get(attachment.origin, context.spaceId);
      const latest = getLatestVersion(attachment);
      if (!latest) {
        return false;
      }
      const stored = latest.data;
      return (
        stored.entityIds.length !== current.entityIds.length ||
        stored.entityIds.some((id, index) => id !== current.entityIds[index])
      );
    } catch (error) {
      logger.warn(
        `Failed to check staleness for investigation impact "${attachment.origin}": ${error}`
      );
      return false;
    }
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
});
