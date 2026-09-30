/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiAnonymizationSettings } from '@kbn/inference-common';
import { getUiSettings } from './ui_settings';

describe('getUiSettings', () => {
  const setting = getUiSettings()[aiAnonymizationSettings];

  it('registers the anonymization setting in the general category for every solution view', () => {
    expect(setting.category).toEqual(['general']);
    expect(setting.solutionViews).toBeUndefined();
  });

  it('ships with every default anonymization rule disabled', () => {
    const { rules } = JSON.parse(setting.value as string) as { rules: Array<{ enabled: boolean }> };

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((rule) => rule.enabled === false)).toBe(true);
  });
});
