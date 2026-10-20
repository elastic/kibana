/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';

const buildMlAttachmentPayloadSchema = <T extends string>(typeLiteral: T) =>
  z
    .object({
      type: z.literal(typeLiteral),
      owner: z.string(),
      data: z.object({
        // the concrete embeddable-state shape is owned by the embeddable
        state: z.record(z.string(), z.unknown()),
      }),
    })
    .strict();

export const AnomalySwimLaneAttachmentPayloadSchema = buildMlAttachmentPayloadSchema(
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE
);
export const AnomalyChartsAttachmentPayloadSchema = buildMlAttachmentPayloadSchema(
  ML_ANOMALY_CHARTS_ATTACHMENT_TYPE
);
export const SingleMetricViewerAttachmentPayloadSchema = buildMlAttachmentPayloadSchema(
  ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE
);

type AnomalySwimLaneAttachmentPayload = z.infer<typeof AnomalySwimLaneAttachmentPayloadSchema>;
type AnomalyChartsAttachmentPayload = z.infer<typeof AnomalyChartsAttachmentPayloadSchema>;
type SingleMetricViewerAttachmentPayload = z.infer<
  typeof SingleMetricViewerAttachmentPayloadSchema
>;

export type AnomalySwimLaneAttachmentData = AnomalySwimLaneAttachmentPayload['data'];
export type AnomalyChartsAttachmentData = AnomalyChartsAttachmentPayload['data'];
export type SingleMetricViewerAttachmentData = SingleMetricViewerAttachmentPayload['data'];
