/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  ONLY_MANAGE_BOOST_PROFILES_ROLE,
  ONLY_MANAGE_BOOST_RULES_ROLE,
  SEARCH_BOOST_MANAGE_ROLE,
  SEARCH_BOOST_READ_ROLE,
} from '../../common/roles';

apiTest.describe('Search boost capabilities', { tag: ['@local-serverless-vectordb'] }, () => {
  for (const { name, role, expected } of [
    {
      name: 'both read privileges',
      role: SEARCH_BOOST_READ_ROLE,
      expected: { show: true, save: false },
    },
    {
      name: 'both manage privileges',
      role: SEARCH_BOOST_MANAGE_ROLE,
      expected: { show: true, save: true },
    },
    {
      name: 'only manage_boost_profiles',
      role: ONLY_MANAGE_BOOST_PROFILES_ROLE,
      expected: { show: true, save: false },
    },
    {
      name: 'only manage_boost_rules',
      role: ONLY_MANAGE_BOOST_RULES_ROLE,
      expected: { show: true, save: false },
    },
  ]) {
    apiTest(
      `a user with ${name} gets show: ${expected.show}, save: ${expected.save}`,
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role);
        const response = await apiClient.post('api/core/capabilities', {
          headers: { ...cookieHeader, 'kbn-xsrf': 'scout', 'x-elastic-internal-origin': 'kibana' },
          body: { applications: [] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.search_boost).toStrictEqual(expected);
      }
    );
  }
});
