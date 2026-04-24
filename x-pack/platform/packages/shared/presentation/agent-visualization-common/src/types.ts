/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { VISUALIZATION_ATTACHMENT_TYPE } from './constants';

export const visualizationTimeRangeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const visualizationAttachmentDataSchema = z.object({
  query: z.string(),
  visualization: z.record(z.string(), z.unknown()),
  chart_type: z.string(),
  esql: z.string(),
  time_range: visualizationTimeRangeSchema.optional(),
});

export type VisualizationAttachmentData = z.infer<typeof visualizationAttachmentDataSchema>;

export type VisualizationAttachment = Attachment<
  typeof VISUALIZATION_ATTACHMENT_TYPE,
  VisualizationAttachmentData
>;

export type PendingVisualizationAttachment = AttachmentInput<
  typeof VISUALIZATION_ATTACHMENT_TYPE,
  VisualizationAttachmentData
>;
