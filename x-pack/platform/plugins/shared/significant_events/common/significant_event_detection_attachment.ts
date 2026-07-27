/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { LifecycleDetection } from '@kbn/significant-events-schema';

export const SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE = 'platform.sig_event_detection' as const;

export type SignificantEventDetectionAttachment = Attachment<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
>;

export type PendingSignificantEventDetectionAttachment = AttachmentInput<
  typeof SIGNIFICANT_EVENT_DETECTION_ATTACHMENT_TYPE,
  LifecycleDetection
>;
