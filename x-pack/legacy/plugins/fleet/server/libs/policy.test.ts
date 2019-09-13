/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyLib } from './policy';
import { InMemoryPolicyAdapter } from './adapters/policy/in_memory';

describe('Policy lib', () => {
  describe('getFull', () => {
    it('return the policy from the policy adapter', async () => {
      const adapter = new InMemoryPolicyAdapter();
      adapter.policies['policy:1'] = { id: 'policy:1' };
      const lib = new PolicyLib(adapter);

      const policy = await lib.getFullPolicy('policy:1');

      expect(policy).toBeDefined();
      expect(policy.id).toBe('policy:1');
    });
  });
});
