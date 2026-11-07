/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { BoostRule } from '../../common/types';
import { DEFAULT_PROTOTYPE_SETTINGS } from '../../common/prototype_settings';
import { simulateProfileDeleteFailure, simulateRuleDeleteFailure } from './simulated_failures';

const mockSettings = { ...DEFAULT_PROTOTYPE_SETTINGS };
jest.mock('./prototype_settings', () => ({
  getPrototypeSettings: async () => mockSettings,
}));

const rule = (name: string, profileName: string): BoostRule => ({
  name,
  index_patterns: [`${name}-*`],
  boost_profile: profileName,
  priority: 0,
  is_builtin: false,
});
jest.mock('../lib/boost_store', () => ({
  getCustomRules: async () => [
    rule('catalogs', 'catalog-search'),
    rule('archives', 'catalog-search'),
    rule('clicks', 'clicks-recent'),
  ],
}));

const client = {} as SavedObjectsClientContract;

describe('simulated delete failures', () => {
  afterEach(() => Object.assign(mockSettings, DEFAULT_PROTOTYPE_SETTINGS));

  it("fails deleting each profile's first rule by name, once the prototype menu asks", async () => {
    await expect(simulateRuleDeleteFailure(client, 'archives')).resolves.toBeUndefined();

    mockSettings.fails_rule_deletes = true;

    await expect(simulateRuleDeleteFailure(client, 'archives')).rejects.toMatchObject({
      statusCode: 504,
    });
    await expect(simulateRuleDeleteFailure(client, 'catalogs')).resolves.toBeUndefined();
    await expect(simulateRuleDeleteFailure(client, 'clicks')).rejects.toMatchObject({
      statusCode: 504,
    });
  });

  it('fails deleting profiles once the prototype menu asks', async () => {
    await expect(simulateProfileDeleteFailure(client)).resolves.toBeUndefined();

    mockSettings.fails_profile_deletes = true;

    await expect(simulateProfileDeleteFailure(client)).rejects.toMatchObject({ statusCode: 504 });
  });
});
