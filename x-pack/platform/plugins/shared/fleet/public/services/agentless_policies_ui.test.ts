/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allowedExperimentalValues } from '../../common/experimental_features';

import { ExperimentalFeaturesService } from './experimental_features';
import { isAgentlessPoliciesUIEnabled } from './agentless_policies_ui';

describe('isAgentlessPoliciesUIEnabled', () => {
  const init = (overrides: Partial<typeof allowedExperimentalValues>) =>
    ExperimentalFeaturesService.init({ ...allowedExperimentalValues, ...overrides });

  it('is true when the kill switch is on', () => {
    init({ enableAgentlessPoliciesUI: true, disableAgentlessLegacyAPI: false });
    expect(isAgentlessPoliciesUIEnabled()).toBe(true);
  });

  it('is false when the kill switch is off and the legacy API is available', () => {
    init({ enableAgentlessPoliciesUI: false, disableAgentlessLegacyAPI: false });
    expect(isAgentlessPoliciesUIEnabled()).toBe(false);
  });

  it('ignores the kill switch when disableAgentlessLegacyAPI is on (legacy fallback would 400)', () => {
    init({ enableAgentlessPoliciesUI: false, disableAgentlessLegacyAPI: true });
    expect(isAgentlessPoliciesUIEnabled()).toBe(true);
  });
});
