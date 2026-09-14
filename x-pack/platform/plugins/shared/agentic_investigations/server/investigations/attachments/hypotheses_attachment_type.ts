/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { investigationHypothesisSchema } from '@kbn/significant-events-schema';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import type { GetNsiClient } from '../nsi_client';

const ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.HYPOTHESES;
type AttachmentId = typeof ATTACHMENT_ID;

const hypothesesAttachmentDataSchema = z.object({
  hypotheses: z.array(investigationHypothesisSchema),
});
type HypothesesAttachmentData = z.infer<typeof hypothesesAttachmentDataSchema>;

export const createHypothesesAttachmentType = (
  getClient: GetNsiClient
): AttachmentTypeDefinition<AttachmentId, HypothesesAttachmentData> => ({
  id: ATTACHMENT_ID,
  isReadonly: true,
  validate: (input) => {
    const result = hypothesesAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  resolve: async (origin, context) => {
    try {
      const client = getClient(context.request, context.spaceId);
      const investigation = await client.get(origin);
      return { hypotheses: investigation.hypotheses ?? [] };
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
    'An investigation hypotheses attachment listing the candidate causes considered during the investigation.',
  getTools: () => [],
});
