/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
  ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
  ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  AnomalyChartsAttachmentPayloadSchema,
  AnomalySwimLaneAttachmentPayloadSchema,
  SingleMetricViewerAttachmentPayloadSchema,
} from './cases_utils';

describe('ML cases attachment payload schemas', () => {
  describe('AnomalySwimLaneAttachmentPayloadSchema', () => {
    const validPayload = {
      type: ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { jobIds: ['job-1'], time_range: { from: 'now-15m', to: 'now' } } },
    };

    it('accepts a valid payload (and an empty `state` bag)', () => {
      expect(AnomalySwimLaneAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
      expect(
        AnomalySwimLaneAttachmentPayloadSchema.safeParse({ ...validPayload, data: { state: {} } })
          .success
      ).toBe(true);
    });

    it('rejects a missing `state`, wrong type literal, or unknown top-level key', () => {
      expect(
        AnomalySwimLaneAttachmentPayloadSchema.safeParse({ ...validPayload, data: {} }).success
      ).toBe(false);
      expect(
        AnomalySwimLaneAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        AnomalySwimLaneAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
      ).toBe(false);
    });
  });

  describe('AnomalyChartsAttachmentPayloadSchema', () => {
    const validPayload = {
      type: ML_ANOMALY_CHARTS_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { jobIds: ['job-1'], maxSeriesToPlot: 6 } },
    };

    it('accepts a valid payload', () => {
      expect(AnomalyChartsAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    });

    it('rejects a wrong type literal and unknown top-level keys', () => {
      expect(
        AnomalyChartsAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        AnomalyChartsAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' }).success
      ).toBe(false);
    });
  });

  describe('SingleMetricViewerAttachmentPayloadSchema', () => {
    const validPayload = {
      type: ML_SINGLE_METRIC_VIEWER_ATTACHMENT_TYPE,
      owner: 'cases',
      data: { state: { jobIds: ['job-1'], detectorIndex: 0 } },
    };

    it('accepts a valid payload', () => {
      expect(SingleMetricViewerAttachmentPayloadSchema.safeParse(validPayload).success).toBe(true);
    });

    it('rejects a wrong type literal and unknown top-level keys', () => {
      expect(
        SingleMetricViewerAttachmentPayloadSchema.safeParse({
          ...validPayload,
          type: ML_ANOMALY_SWIMLANE_ATTACHMENT_TYPE,
        }).success
      ).toBe(false);
      expect(
        SingleMetricViewerAttachmentPayloadSchema.safeParse({ ...validPayload, extra: 'nope' })
          .success
      ).toBe(false);
    });
  });
});
