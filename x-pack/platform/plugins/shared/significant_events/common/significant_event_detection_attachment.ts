/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { CHANGE_POINT_TYPES, type LifecycleDetection } from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';

export const SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE = 'platform.sig_event_detection' as const;

export type SignificantEventDetectionAttachment = Attachment<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
>;

export type PendingSignificantEventDetectionAttachment = AttachmentInput<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
>;

export const lifecycleDetectionAttachmentSchema = z.object({
  '@timestamp': z.string(),
  detection_id: z.string(),
  rule_name: z.string().optional(),
  rule_uuid: z.string().optional(),
  stream_name: z.string().optional(),
  change_point_type: z.enum(CHANGE_POINT_TYPES).optional(),
});
