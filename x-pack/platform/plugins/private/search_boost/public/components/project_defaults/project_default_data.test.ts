/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockProfiles, mockRules } from '../test_utils/mock_boost_data';
import { getProjectDefaults } from './project_default_data';

const getRule = (name: string) => mockRules.find((rule) => rule.name === name);
const getProfile = (name: string) => mockProfiles.find((profile) => profile.name === name);

describe('getProjectDefaults', () => {
  it("reads each type's default rule, with its profile and matches", () => {
    expect(getProjectDefaults(mockProfiles, mockRules)).toEqual({
      indices: {
        ruleName: 'default_indices',
        profile: getProfile('default_indices'),
        matches: getRule('default_indices')?.matches,
      },
      dataStreams: {
        ruleName: 'default_data_streams',
        profile: getProfile('default_data_streams_7d'),
        matches: getRule('default_data_streams')?.matches,
      },
    });
  });

  it('follows the default rule to a custom profile', () => {
    const rules = mockRules.map((rule) =>
      rule.name === 'default_indices' ? { ...rule, boost_profile: 'catalog-fast' } : rule
    );

    expect(getProjectDefaults(mockProfiles, rules).indices?.profile).toBe(
      getProfile('catalog-fast')
    );
  });

  it('leaves out a type without a default rule', () => {
    const rules = mockRules.filter(({ name }) => name !== 'default_data_streams');

    expect(getProjectDefaults(mockProfiles, rules)).toEqual({
      indices: expect.objectContaining({ ruleName: 'default_indices' }),
      dataStreams: undefined,
    });
  });

  it("leaves out a type whose default rule's profile isn't loaded", () => {
    const profiles = mockProfiles.filter(({ name }) => name !== 'default_indices');

    expect(getProjectDefaults(profiles, mockRules)).toEqual({
      indices: undefined,
      dataStreams: expect.objectContaining({ ruleName: 'default_data_streams' }),
    });
  });

  it('ignores custom rules of the same type', () => {
    const rules = mockRules.filter(({ name }) => name !== 'default_indices');

    expect(getProjectDefaults(mockProfiles, rules).indices).toBeUndefined();
  });

  it('has no defaults when Elasticsearch returns no default rules', () => {
    expect(getProjectDefaults(mockProfiles, [])).toEqual({
      indices: undefined,
      dataStreams: undefined,
    });
  });
});
