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

const ATTACHMENT_ID = INVESTIGATION_ATTACHMENT_IDS.IMPACT;
type AttachmentId = typeof ATTACHMENT_ID;

const impactAttachmentDataSchema = investigationSchema.pick({ impactedEntities: true });
type ImpactAttachmentData = z.infer<typeof impactAttachmentDataSchema>;

export const createImpactAttachmentType = (
  getService: () => InvestigationsService
): AttachmentTypeDefinition<AttachmentId, ImpactAttachmentData> => ({
  id: ATTACHMENT_ID,
  isReadonly: true,
  validate: (input) => {
    const result = impactAttachmentDataSchema.safeParse(input);
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
      return { impactedEntities: record.impactedEntities };
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
    'An investigation impact attachment listing the entities affected by the investigation.',
  getTools: () => [],
});
