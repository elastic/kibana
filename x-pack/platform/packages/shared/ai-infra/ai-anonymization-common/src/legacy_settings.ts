/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnonymizationFailureMode, AnonymizationRule, AnonymizationSettings } from './types';
import { isAnonymizationMaskingEnabled } from './is_masking_enabled';
import { refreshBuiltInAnonymizationRules } from './refresh_builtin_rules';

const parseLegacyAnonymizationSettings = (value: unknown): AnonymizationSettings | undefined => {
  let parsed: unknown = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray((parsed as AnonymizationSettings).rules)
  ) {
    return undefined;
  }

  return parsed as AnonymizationSettings;
};

export const parseLegacyAnonymizationRules = (value: unknown): AnonymizationRule[] => {
  const settings = parseLegacyAnonymizationSettings(value);
  if (!settings) {
    return [];
  }

  // Master switch: when masking is disabled, no rule should run at all.
  if (!isAnonymizationMaskingEnabled(settings)) {
    return [];
  }

  return refreshBuiltInAnonymizationRules(settings.rules).filter((rule) => rule.enabled);
};

export const parseLegacyOnFailureMode = (value: unknown): AnonymizationFailureMode =>
  parseLegacyAnonymizationSettings(value)?.onFailure ?? 'block';
