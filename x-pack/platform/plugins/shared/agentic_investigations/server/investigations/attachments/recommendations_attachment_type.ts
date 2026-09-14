/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import type { z } from '@kbn/zod/v4';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import { investigationSchema } from '../../../common/investigations/investigation';
import type { InvestigationsService } from '../services/investigations_service';

const ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS;
type AttachmentId = typeof ATTACHMENT_ID;

const recommendationsAttachmentDataSchema = investigationSchema.pick({ recommendations: true });
type RecommendationsAttachmentData = z.infer<typeof recommendationsAttachmentDataSchema>;

export const createRecommendationsAttachmentType = (
  getService: () => InvestigationsService
): AttachmentTypeDefinition<AttachmentId, RecommendationsAttachmentData> => ({
  id: ATTACHMENT_ID,
  isReadonly: true,
  validate: (input) => {
    const result = recommendationsAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  resolve: async (origin, context) => {
    try {
      const record = await getService().get(context.spaceId, origin);
      if (!record) {
        return undefined;
      }
      return { recommendations: record.recommendations };
    } catch {
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    try {
      const record = await getService().get(context.spaceId, attachment.origin);
      if (!record) {
        return false;
      }
      if (!attachment.origin_snapshot_at) {
        return true;
      }
      return new Date(record.updatedAt) > new Date(attachment.origin_snapshot_at);
    } catch {
      return false;
    }
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: JSON.stringify(attachment.data, null, 2),
    }),
  }),
  getAgentDescription: () =>
    'An investigation recommendations attachment listing concrete actionable steps to resolve or mitigate the investigated issue.',
  getTools: () => [],
});
