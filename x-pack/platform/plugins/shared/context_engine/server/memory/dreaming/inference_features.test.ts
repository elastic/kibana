/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import {
  CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
  CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
} from '../../../common/memory';
import { registerContextEngineInferenceFeatures } from './inference_features';

describe('registerContextEngineInferenceFeatures', () => {
  const setup = (result: { ok: true } | { ok: false; error: string } = { ok: true }) => {
    const register = jest.fn().mockReturnValue(result);
    const searchInferenceEndpoints = {
      features: { register },
    } as unknown as SearchInferenceEndpointsPluginSetup;
    return { register, searchInferenceEndpoints };
  };

  it('registers the dreaming model setting under a Context Engine parent', () => {
    const { register, searchInferenceEndpoints } = setup();

    registerContextEngineInferenceFeatures({
      searchInferenceEndpoints,
      logger: loggerMock.create(),
    });

    expect(register.mock.calls.map(([feature]) => feature)).toEqual([
      expect.objectContaining({
        featureId: CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
        taskType: 'chat_completion',
      }),
      expect.objectContaining({
        featureId: CONTEXT_ENGINE_MEMORY_INFERENCE_FEATURE_ID,
        parentFeatureId: CONTEXT_ENGINE_INFERENCE_FEATURE_ID,
        taskType: 'chat_completion',
      }),
    ]);
  });

  it('logs a warning when a feature cannot be registered', () => {
    const { searchInferenceEndpoints } = setup({ ok: false, error: 'already registered' });
    const logger = loggerMock.create();

    registerContextEngineInferenceFeatures({ searchInferenceEndpoints, logger });

    expect(logger.warn).toHaveBeenCalledWith(
      `Failed to register inference feature '${CONTEXT_ENGINE_INFERENCE_FEATURE_ID}': already registered`
    );
  });
});
