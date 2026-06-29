/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
  AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE,
  AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';

const buildAiopsAttachmentPayloadSchema = <T extends string>(typeLiteral: T) =>
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

export const ChangePointChartAttachmentPayloadSchema = buildAiopsAttachmentPayloadSchema(
  AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE
);
export const LogRateAnalysisAttachmentPayloadSchema = buildAiopsAttachmentPayloadSchema(
  AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE
);
export const PatternAnalysisAttachmentPayloadSchema = buildAiopsAttachmentPayloadSchema(
  AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE
);

type ChangePointChartAttachmentPayload = z.infer<typeof ChangePointChartAttachmentPayloadSchema>;
type LogRateAnalysisAttachmentPayload = z.infer<typeof LogRateAnalysisAttachmentPayloadSchema>;
type PatternAnalysisAttachmentPayload = z.infer<typeof PatternAnalysisAttachmentPayloadSchema>;

export type ChangePointChartAttachmentData = ChangePointChartAttachmentPayload['data'];
export type LogRateAnalysisAttachmentData = LogRateAnalysisAttachmentPayload['data'];
export type PatternAnalysisAttachmentData = PatternAnalysisAttachmentPayload['data'];
