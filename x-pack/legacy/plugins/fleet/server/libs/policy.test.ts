/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyLib } from './policy';
import { InMemoryPoliciesRepository } from '../repositories/policies/in_memory';
import { FullPolicyFile } from '../repositories/policies/types';

describe('Policy lib', () => {
  describe('getFull', () => {
    it('return the policy from the policy adapter', async () => {
      const adapter = new InMemoryPoliciesRepository();
      adapter.policies['policy:1'] = ({
        id: 'policy:1',
        name: 'Policy',
      } as unknown) as FullPolicyFile;
      const lib = new PolicyLib(adapter);

      const policy = await lib.getFullPolicy('policy:1');

      expect(policy).toBeDefined();
      expect(policy.id).toBe('policy:1');
    });
  });
});
