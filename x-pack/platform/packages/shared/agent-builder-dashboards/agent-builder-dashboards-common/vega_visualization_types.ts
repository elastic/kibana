/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { VEGA_VISUALIZATION_ATTACHMENT_TYPE } from './constants';

export const VEGA_DIALECTS = ['vega', 'vega-lite'] as const;
export type VegaDialect = (typeof VEGA_DIALECTS)[number];

export const vegaVisualizationAttachmentDataSchema = z.object({
  title: z.string().min(1, 'title must be non-empty'),
  spec: z.record(z.string(), z.unknown()),
  dialect: z.enum(VEGA_DIALECTS),
});

export type VegaVisualizationAttachmentData = z.infer<typeof vegaVisualizationAttachmentDataSchema>;

export type VegaVisualizationAttachment = Attachment<
  typeof VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  VegaVisualizationAttachmentData
>;

export type PendingVegaVisualizationAttachment = AttachmentInput<
  typeof VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  VegaVisualizationAttachmentData
>;

export const isVegaVisualizationAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof VEGA_VISUALIZATION_ATTACHMENT_TYPE,
  VegaVisualizationAttachmentData
> => attachment.type === VEGA_VISUALIZATION_ATTACHMENT_TYPE;
