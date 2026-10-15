/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../../common/constants';
import { appContextService } from '../app_context';

import { isAwsIdentityFederationEnabled } from './aws_identity_federation';

jest.mock('../app_context');

describe('isAwsIdentityFederationEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false])('follows the flag when it is %s', async (flag) => {
    const getBooleanValue$ = jest.fn().mockReturnValue(of(flag));
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue({ getBooleanValue$ } as any);

    await expect(isAwsIdentityFederationEnabled()).resolves.toBe(flag);
    expect(getBooleanValue$).toHaveBeenCalledWith(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
  });

  it('is enabled when feature flags are unavailable', async () => {
    jest.spyOn(appContextService, 'getFeatureFlags').mockReturnValue(undefined);

    await expect(isAwsIdentityFederationEnabled()).resolves.toBe(true);
  });
});
