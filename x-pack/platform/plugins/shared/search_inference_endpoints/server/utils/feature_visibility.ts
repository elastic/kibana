/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { InferenceFeatureResponse } from '../../common/types';
import type { InferenceFeatureConfig } from '../types';

/**
 * Reads every uiSetting referenced by a feature's `visibilityCondition` once,
 * in parallel, then returns a synchronous predicate that decides whether a
 * given feature is visible. Failures to read a uiSetting fail open — the
 * feature is shown — and are logged at debug.
 */
export const buildVisibilityCheck = async (
  features: InferenceFeatureConfig[],
  uiSettingsClient: IUiSettingsClient,
  logger: Logger
): Promise<(feature: InferenceFeatureConfig) => boolean> => {
  const keys = new Set<string>();
  for (const feature of features) {
    if (feature.visibilityCondition) keys.add(feature.visibilityCondition.key);
  }

  const FAIL_OPEN = Symbol('failOpen');
  const settingValues = new Map<string, unknown>();

  await Promise.all(
    [...keys].map(async (key) => {
      try {
        settingValues.set(key, await uiSettingsClient.get(key));
      } catch (error) {
        logger.debug(
          `Failed to read uiSetting "${key}" while resolving inference feature visibility; failing open. Reason: ${error.message}`
        );
        settingValues.set(key, FAIL_OPEN);
      }
    })
  );

  return (feature) => {
    if (!feature.visibilityCondition) return true;
    const value = settingValues.get(feature.visibilityCondition.key);
    return value === FAIL_OPEN || value === feature.visibilityCondition.value;
  };
};

/**
 * Applies the `isVisible` predicate to every feature, cascading visibility from
 * parent to descendants (a hidden parent hides its children) and dropping any
 * parent whose registered children are all hidden — we don't want an empty
 * group lingering in the UI. Parents without any registered children always
 * pass through.
 */
export const filterVisibleFeatures = (
  features: InferenceFeatureConfig[],
  isVisible: (feature: InferenceFeatureConfig) => boolean
): InferenceFeatureConfig[] => {
  const featuresById = new Map<string, InferenceFeatureConfig>();
  for (const feature of features) featuresById.set(feature.featureId, feature);

  const effectiveCache = new Map<string, boolean>();
  const isEffectivelyVisible = (feature: InferenceFeatureConfig): boolean => {
    const cached = effectiveCache.get(feature.featureId);
    if (cached !== undefined) return cached;

    let result: boolean;
    if (!isVisible(feature)) {
      result = false;
    } else if (feature.parentFeatureId) {
      const parent = featuresById.get(feature.parentFeatureId);
      result = parent ? isEffectivelyVisible(parent) : true;
    } else {
      result = true;
    }

    effectiveCache.set(feature.featureId, result);
    return result;
  };

  const visibleIds = new Set<string>();
  const parentsWithVisibleChild = new Set<string>();
  const parentsWithAnyChild = new Set<string>();

  for (const feature of features) {
    if (feature.parentFeatureId) parentsWithAnyChild.add(feature.parentFeatureId);
    if (isEffectivelyVisible(feature)) {
      visibleIds.add(feature.featureId);
      if (feature.parentFeatureId) parentsWithVisibleChild.add(feature.parentFeatureId);
    }
  }

  return features.filter((feature) => {
    if (!visibleIds.has(feature.featureId)) return false;
    const isOrphanedParent =
      !feature.parentFeatureId &&
      parentsWithAnyChild.has(feature.featureId) &&
      !parentsWithVisibleChild.has(feature.featureId);
    return !isOrphanedParent;
  });
};

/**
 * Strips the server-only `visibilityCondition` field before sending a feature
 * over the wire — clients should see the gate's effect, not the gate itself.
 */
export const toFeatureResponse = (feature: InferenceFeatureConfig): InferenceFeatureResponse => {
  const { visibilityCondition: _stripped, ...rest } = feature;
  return rest;
};
