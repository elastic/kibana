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
import { impactSchema, type Impact, type ImpactEntity } from '../../../common/impact/impact';
import type { ImpactService } from '../services/impact_service';
import { ImpactNotFoundError } from '../services/errors';

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

const entitySignature = (entity: ImpactEntity): string =>
  [
    entity.id,
    entity.name ?? '',
    entity.type ?? '',
    entity.featureId ?? '',
    entity.streamName ?? '',
  ].join('\0');

const entitiesChanged = (stored: ImpactEntity[], current: ImpactEntity[]): boolean => {
  if (stored.length !== current.length) {
    return true;
  }
  return stored.some((entity, index) => {
    const next = current[index];
    return next === undefined || entitySignature(entity) !== entitySignature(next);
  });
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
      return entitiesChanged(latest.data.entities, current.entities);
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
