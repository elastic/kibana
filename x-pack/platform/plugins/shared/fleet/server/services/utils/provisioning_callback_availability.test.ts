/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '../app_context';

import { getProvisioningCallbackAvailability } from './provisioning_callback_availability';

jest.mock('../app_context');

const setPublicBaseUrl = (publicBaseUrl: string | undefined) =>
  jest.mocked(appContextService).getHttpSetup.mockReturnValue({
    basePath: { publicBaseUrl },
  } as any);

describe('getProvisioningCallbackAvailability', () => {
  it('is unavailable without a public URL', () => {
    setPublicBaseUrl(undefined);

    expect(getProvisioningCallbackAvailability()).toEqual({
      available: false,
      reason: 'Kibana has no public URL: server.publicBaseUrl is not set.',
    });
  });

  it('is unavailable when the public URL is not https', () => {
    setPublicBaseUrl('http://kibana.example.com/');

    expect(getProvisioningCallbackAvailability()).toEqual({
      available: false,
      kibanaUrl: 'http://kibana.example.com',
      reason:
        'The public Kibana URL http://kibana.example.com is not https. CloudFormation only accepts an https callback URL.',
    });
  });

  it('is available with the https public URL, without its trailing slash', () => {
    setPublicBaseUrl('https://kibana.example.com/');

    expect(getProvisioningCallbackAvailability()).toEqual({
      available: true,
      kibanaUrl: 'https://kibana.example.com',
    });
  });
});
