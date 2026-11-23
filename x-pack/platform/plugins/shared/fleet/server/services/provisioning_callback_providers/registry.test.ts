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
  provisioningCallbackReportSchema,
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

  it('accepts a report shaped for any registered provider, and nothing else', () => {
    const awsReport = {
      role_arn: 'arn:aws:iam::123456789012:role/ElasticWorkloadIdentity-abc',
      stack_arn: 'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic/uuid-1',
      origin_proof: {
        region: 'us-east-1',
        headers: { Authorization: 'AWS4-HMAC-SHA256 ...' },
        body: 'Action=GetCallerIdentity&Version=2011-06-15',
      },
    };
    expect(provisioningCallbackReportSchema().validate(awsReport)).toEqual(awsReport);
    expect(() => provisioningCallbackReportSchema().validate({ origin_proof: {} })).toThrow();
  });

  it('every module names the provider it is registered under', () => {
    for (const provider of registeredProvisioningCallbackProviders()) {
      expect(getProvisioningCallbackProvider(provider)?.provider).toBe(provider);
    }
  });
});
