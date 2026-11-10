/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPivotConfig } from '../../../../../../common/types/transform';
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { applyTransformConfigToDetailsState, getDefaultStepDetailsState } from './common';

const transformConfig = {
  id: 'the-transform-id',
  source: { index: ['the-source-index'] },
  dest: { index: 'the-destination-index', pipeline: 'the-pipeline' },
  pivot: { group_by: {}, aggregations: {} },
  description: 'the description',
  frequency: '3s',
  sync: { time: { field: 'order_date', delay: '120s' } },
  retention_policy: { time: { field: 'order_date.max', max_age: '1d' } },
  settings: { max_page_search_size: 250, num_failure_retries: 0 },
  _meta: { owner: 'the-owner' },
} as TransformPivotConfig;

describe('Transform: Details Common', () => {
  test('getDefaultStepDetailsState() uses the latest page size for latest transforms', () => {
    expect(getDefaultStepDetailsState().transformSettingsMaxPageSearchSize).toBe(500);
    expect(
      getDefaultStepDetailsState(TRANSFORM_FUNCTION.LATEST).transformSettingsMaxPageSearchSize
    ).toBe(5000);
  });

  test('applyTransformConfigToDetailsState() keeps the defaults without a config', () => {
    expect(applyTransformConfigToDetailsState(getDefaultStepDetailsState())).toEqual(
      getDefaultStepDetailsState()
    );
  });

  test('applyTransformConfigToDetailsState() pre-fills every cloneable setting', () => {
    const state = applyTransformConfigToDetailsState(getDefaultStepDetailsState(), transformConfig);

    expect(state).toEqual(
      expect.objectContaining({
        transformId: '',
        destinationIndex: '',
        transformDescription: 'the description',
        destinationIngestPipeline: 'the-pipeline',
        transformFrequency: '3s',
        isContinuousModeEnabled: true,
        continuousModeDateField: 'order_date',
        continuousModeDelay: '120s',
        isRetentionPolicyEnabled: true,
        retentionPolicyDateField: 'order_date.max',
        retentionPolicyMaxAge: '1d',
        transformSettingsMaxPageSearchSize: 250,
        transformSettingsNumFailureRetries: 0,
        transformSettingsDocsPerSecond: null,
        _meta: { owner: 'the-owner' },
      })
    );
  });
});
