/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { investigationBlindSpotSchema } from '@kbn/significant-events-schema';
import { INVESTIGATION_ATTACHMENT_IDS } from '../../../common/investigations/constants';
import type { InvestigationsService } from '../storage/investigations_service';

const ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.BLIND_SPOTS;
type AttachmentId = typeof ATTACHMENT_ID;

const blindSpotsAttachmentDataSchema = z.object({
  blind_spots: z.array(investigationBlindSpotSchema),
});
type BlindSpotsAttachmentData = z.infer<typeof blindSpotsAttachmentDataSchema>;

export const createBlindSpotsAttachmentType = (
  service: InvestigationsService
): AttachmentTypeDefinition<AttachmentId, BlindSpotsAttachmentData> => ({
  id: ATTACHMENT_ID,
  isReadonly: true,
  validate: (input) => {
    const result = blindSpotsAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  resolve: async (origin, context) => {
    try {
      const investigation = await service.get(context.spaceId, origin);
      return { blind_spots: (investigation?.blindSpots ?? []) as BlindSpotsAttachmentData['blind_spots'] };
    } catch {
      return undefined;
    }
  },
  isStale: async (attachment, context) => {
    try {
      const investigation = await service.get(context.spaceId, attachment.origin);
      if (!attachment.origin_snapshot_at) return true;
      if (!investigation?.completedAt) return false;
      return new Date(investigation.completedAt) > new Date(attachment.origin_snapshot_at);
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
    'An investigation blind spots attachment listing the data gaps that limited the investigation.',
  getTools: () => [],
});
