/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
  AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE,
  AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  ChangePointChartAttachmentPayloadSchema,
  LogRateAnalysisAttachmentPayloadSchema,
  PatternAnalysisAttachmentPayloadSchema,
} from './utils';

describe('AIOps cases attachment payload schemas', () => {
  describe('ChangePointChartAttachmentPayloadSchema', () => {
    const validPayload = {
      type: AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { dataViewId: 'dv-1', metricField: 'cpu' } },
    };

    it('accepts a valid payload (and an empty `state` bag)', () => {
      expect(ChangePointChartAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
      expect(
        ChangePointChartAttachmentPayloadSchema.safeParse({ ...validPayload, data: { state: {} } })
          .success
      ).toBe(true);
    });

    it('rejects a missing `state`, wrong type literal, or unknown top-level key', () => {
      expect(
        ChangePointChartAttachmentPayloadSchema.safeParse({ ...validPayload, data: {} }).success
      ).toBe(false);
      expect(
        ChangePointChartAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        ChangePointChartAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' })
          .success
      ).toBe(false);
    });
  });

  describe('LogRateAnalysisAttachmentPayloadSchema', () => {
    const validPayload = {
      type: AIOPS_LOG_RATE_ANALYSIS_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { dataViewId: 'dv-1' } },
    };

    it('accepts a valid payload', () => {
      expect(LogRateAnalysisAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    });

    it('rejects a wrong type literal and unknown top-level keys', () => {
      expect(
        LogRateAnalysisAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        LogRateAnalysisAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
      ).toBe(false);
    });
  });

  describe('PatternAnalysisAttachmentPayloadSchema', () => {
    const validPayload = {
      type: AIOPS_PATTERN_ANALYSIS_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { dataViewId: 'dv-1', categorizationFieldName: 'message' } },
    };

    it('accepts a valid payload', () => {
      expect(PatternAnalysisAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    });

    it('rejects a wrong type literal and unknown top-level keys', () => {
      expect(
        PatternAnalysisAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: AIOPS_CHANGE_POINT_CHART_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        PatternAnalysisAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
      ).toBe(false);
    });
  });
});
