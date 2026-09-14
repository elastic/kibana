/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { investigationRecommendationSchema } from '@kbn/significant-events-schema';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import type { GetNsiClient } from '../nsi_client';

const ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS;
type AttachmentId = typeof ATTACHMENT_ID;

const recommendationsAttachmentDataSchema = z.object({
  recommendations: z.array(investigationRecommendationSchema),
});
type RecommendationsAttachmentData = z.infer<typeof recommendationsAttachmentDataSchema>;

export const createRecommendationsAttachmentType = (
  getClient: GetNsiClient
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
      const client = getClient(context.request, context.spaceId);
      const investigation = await client.get(origin);
      return { recommendations: investigation.recommendations ?? [] };
    } catch {
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    try {
      const client = getClient(context.request, context.spaceId);
      const investigation = await client.get(attachment.origin);
      if (!attachment.origin_snapshot_at) return true;
      if (!investigation.completed_at) return false;
      return new Date(investigation.completed_at) > new Date(attachment.origin_snapshot_at);
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
