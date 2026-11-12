/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_IDENTITY_FEDERATION_ENABLED_FLAG } from '../../../common/constants';
import type { FleetRequestHandlerContext } from '../../types';

import { isAwsIdentityFederationEnabled } from './aws_identity_federation';

describe('isAwsIdentityFederationEnabled', () => {
  const contextWith = (getBooleanValue: jest.Mock) =>
    ({
      core: Promise.resolve({ featureFlags: { getBooleanValue } }),
    } as unknown as FleetRequestHandlerContext);

  it.each([true, false])('reads the flag from the request context when it is %s', async (flag) => {
    const getBooleanValue = jest.fn().mockResolvedValue(flag);

    await expect(isAwsIdentityFederationEnabled(contextWith(getBooleanValue))).resolves.toBe(flag);
    // Enabled by default, as in the browser.
    expect(getBooleanValue).toHaveBeenCalledWith(AWS_IDENTITY_FEDERATION_ENABLED_FLAG, true);
  });
});
