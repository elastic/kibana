/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_BUILDER_DECISION_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
} from '@kbn/agent-builder-common/constants';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { registerInferenceFeatures } from './inference_features';

describe('registerInferenceFeatures', () => {
  it('registers decision models as a decision section shown only with experimental features on', () => {
    const register = jest.fn().mockReturnValue({ ok: true });

    registerInferenceFeatures({ searchInferenceEndpoints: { features: { register } } });

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        featureId: AGENT_BUILDER_DECISION_INFERENCE_FEATURE_ID,
        parentFeatureId: AGENT_BUILDER_PARENT_INFERENCE_FEATURE_ID,
        taskType: 'decision',
        ignoreGlobalDefault: true,
        visibilityCondition: { key: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID, value: true },
      })
    );
  });

  it('keeps the main and fast sections as chat completion features', () => {
    const register = jest.fn().mockReturnValue({ ok: true });

    registerInferenceFeatures({ searchInferenceEndpoints: { features: { register } } });

    const taskTypes = register.mock.calls.map(([{ taskType }]) => taskType);

    expect(taskTypes).toEqual([
      'chat_completion',
      'chat_completion',
      'chat_completion',
      'decision',
    ]);
  });
});
