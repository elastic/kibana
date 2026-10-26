/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';

import { FeaturePrivilegeAiIndexBuilder } from './ai_index';
import { Actions } from '../../actions';

const createPrivilege = (
  aiIndex?: FeatureKibanaPrivileges['aiIndex']
): FeatureKibanaPrivileges => ({
  ...(aiIndex ? { aiIndex } : {}),
  savedObject: {
    all: [],
    read: [],
  },
  ui: [],
});

describe(`ai_index`, () => {
  describe(`feature_privilege_builder`, () => {
    it('grants no privileges when the `aiIndex` privilege is not defined', () => {
      const actions = new Actions();
      const aiIndexFeaturePrivilege = new FeaturePrivilegeAiIndexBuilder(actions);

      expect(aiIndexFeaturePrivilege.getActions(createPrivilege())).toEqual([]);
    });

    it('grants no privileges when `aiIndex.read` is an empty array', () => {
      const actions = new Actions();
      const aiIndexFeaturePrivilege = new FeaturePrivilegeAiIndexBuilder(actions);

      expect(aiIndexFeaturePrivilege.getActions(createPrivilege({ read: [] }))).toEqual([]);
    });

    it('grants one `ai_index:<kiType>/read` action per declared KI type', () => {
      const actions = new Actions();
      const aiIndexFeaturePrivilege = new FeaturePrivilegeAiIndexBuilder(actions);

      expect(
        aiIndexFeaturePrivilege.getActions(createPrivilege({ read: ['dashboard', 'lens'] }))
      ).toEqual(['ai_index:dashboard/read', 'ai_index:lens/read']);
    });
  });
});
