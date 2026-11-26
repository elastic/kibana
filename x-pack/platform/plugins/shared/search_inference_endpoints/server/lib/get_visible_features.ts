/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { InferenceFeatureRegistry } from '../inference_feature_registry';
import type { RegisteredInferenceFeature } from '../types';

type ConditionValue = string | number | boolean | null;

/** Returns the registered features shown on the model settings page: not hidden, with a met visibility condition. */
export const getVisibleFeatures = async (
  featureRegistry: InferenceFeatureRegistry,
  uiSettingsClient: IUiSettingsClient,
  logger: Logger
): Promise<RegisteredInferenceFeature[]> => {
  const nonHiddenFeatures = featureRegistry.getAll().filter(({ isHidden }) => !isHidden);

  const conditionKeys = [
    ...new Set(
      nonHiddenFeatures.flatMap((feature) =>
        feature.visibilityCondition ? [feature.visibilityCondition.key] : []
      )
    ),
  ];

  // Read each referenced uiSetting in parallel. Failing to read a setting
  // fails open (the feature stays visible) so the page degrades gracefully
  // when uiSettings is unavailable; the missing key is detected by the
  // `.has()` check below rather than a sentinel value.
  const settingValues = new Map<string, ConditionValue>();
  await Promise.all(
    conditionKeys.map(async (key) => {
      try {
        settingValues.set(key, await uiSettingsClient.get<ConditionValue>(key));
      } catch (error) {
        logger.debug(
          `Failed to read uiSetting "${key}" while resolving inference feature visibility; failing open. Reason: ${error.message}`
        );
      }
    })
  );

  return nonHiddenFeatures.filter((feature) => {
    const condition = feature.visibilityCondition;
    if (!condition) return true;
    if (!settingValues.has(condition.key)) return true;
    return settingValues.get(condition.key) === condition.value;
  });
};
