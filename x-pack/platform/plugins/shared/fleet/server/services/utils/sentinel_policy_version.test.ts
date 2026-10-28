/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { ENABLE_SENTINEL_POLICY_VERSION_FLAG } from '../../../common/constants';
import { appContextService } from '../app_context';

import { isSentinelPolicyVersionEnabled } from './sentinel_policy_version';

jest.mock('../app_context');

const mockEnvironment = ({
  versionSpecificPolicies,
  flag,
}: {
  versionSpecificPolicies: boolean;
  flag?: boolean;
}) => {
  jest.spyOn(appContextService, 'getExperimentalFeatures').mockReturnValue({
    enableVersionSpecificPolicies: versionSpecificPolicies,
  } as any);
  if (flag === undefined) {
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue(undefined);
  } else {
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue({
      getBooleanValue$: jest.fn().mockReturnValue(of(flag)),
    } as any);
  }
};

describe('isSentinelPolicyVersionEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['version specific policies on + flag on', { versionSpecificPolicies: true, flag: true }, true],
    [
      'version specific policies on + flag off',
      { versionSpecificPolicies: true, flag: false },
      false,
    ],
    [
      'version specific policies off + flag on',
      { versionSpecificPolicies: false, flag: true },
      false,
    ],
    [
      'version specific policies on + feature flags service unavailable',
      { versionSpecificPolicies: true },
      false,
    ],
  ])('%s', async (_name, env, expected) => {
    mockEnvironment(env);
    expect(await isSentinelPolicyVersionEnabled()).toBe(expected);
  });

  it('reads the flag with a false fallback', async () => {
    mockEnvironment({ versionSpecificPolicies: true, flag: true });
    await isSentinelPolicyVersionEnabled();
    expect(appContextService.getFeatureFlags()!.getBooleanValue$).toHaveBeenCalledWith(
      ENABLE_SENTINEL_POLICY_VERSION_FLAG,
      false
    );
  });
});
