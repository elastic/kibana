/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import type { AnonymizationSettings } from '@kbn/ai-anonymization-common';
import { getAnonymizationUiSettings } from './ui_settings';

describe('getAnonymizationUiSettings', () => {
  const setting = getAnonymizationUiSettings()[aiAnonymizationSettings];

  it('registers the anonymization setting in the general category for every solution view', () => {
    expect(setting.category).toEqual(['general']);
    expect(setting.solutionViews).toBeUndefined();
  });

  it('ships a valid default with every anonymization rule disabled', () => {
    const { rules }: AnonymizationSettings = JSON.parse(String(setting.value));

    expect(() => setting.schema.validate({ rules })).not.toThrow();
    expect(rules).not.toHaveLength(0);
    expect(rules.filter(({ enabled }) => enabled)).toEqual([]);
  });
});
