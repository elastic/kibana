/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostProfile, BoostRuleListItem } from '../../../common/types';
import { mockProfiles, mockRules } from './mock_boost_data';

export const getMockProfile = (name: string): BoostProfile => {
  const profile = mockProfiles.find((mockProfile) => mockProfile.name === name);
  if (!profile) throw new Error(`Unknown mock profile "${name}"`);
  return profile;
};

export const getMockRule = (name: string): BoostRuleListItem => {
  const rule = mockRules.find((mockRule) => mockRule.name === name);
  if (!rule) throw new Error(`Unknown mock rule "${name}"`);
  return rule;
};

export const getMockRulesUsing = (profileName: string): BoostRuleListItem[] =>
  mockRules.filter(({ boost_profile: boostProfile }) => boostProfile === profileName);
