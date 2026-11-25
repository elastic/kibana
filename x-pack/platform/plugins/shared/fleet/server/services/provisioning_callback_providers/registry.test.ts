/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROVISIONING_CALLBACK_PROVIDERS } from '../../../common/types/models/provisioning_callback';

import { awsProvisioningCallbackProvider } from './aws';
import {
  getProvisioningCallbackProvider,
  registeredProvisioningCallbackProviders,
} from './registry';

describe('provisioning callback provider registry', () => {
  it('hands out the AWS module for aws records', () => {
    expect(getProvisioningCallbackProvider('aws')).toBe(awsProvisioningCallbackProvider);
  });

  it('has no module for a provider without a receiver', () => {
    expect(getProvisioningCallbackProvider('azure')).toBeUndefined();
    expect(getProvisioningCallbackProvider('gcp')).toBeUndefined();
  });

  it('registers exactly the providers the request schemas accept', () => {
    expect([...registeredProvisioningCallbackProviders()].sort()).toEqual(
      [...PROVISIONING_CALLBACK_PROVIDERS].sort()
    );
  });

  it('every module names the provider it is registered under', () => {
    for (const provider of registeredProvisioningCallbackProviders()) {
      expect(getProvisioningCallbackProvider(provider)?.provider).toBe(provider);
    }
  });
});
