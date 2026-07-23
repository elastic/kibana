/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../app_context';

import {
  isAgentlessEnabled,
  prependAgentlessApiBasePathToEndpoint,
  logLegacyAgentlessWriteDeprecation,
  LEGACY_AGENTLESS_WRITE_DEPRECATION_MARKER,
  isManagedBulkEnabled,
  getManagedBulkEndpoint,
} from './agentless';

jest.mock('../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

describe('isAgentlessEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getConfig.mockReset();
  });
  it('should return false if cloud is not enabled', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: false,
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);

    expect(isAgentlessEnabled()).toBe(false);
  });

  it('should return false if cloud is enabled but agentless is not', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: false,
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    expect(isAgentlessEnabled()).toBe(false);
  });

  it('should return true if cloud is enabled and agentless is enabled', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    expect(isAgentlessEnabled()).toBe(true);
  });
});

describe('logLegacyAgentlessWriteDeprecation', () => {
  const warn = jest.fn();

  beforeEach(() => {
    warn.mockReset();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue({ warn } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('warns with the stable marker and the operation', () => {
    logLegacyAgentlessWriteDeprecation('create package policy');

    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0] as string;
    expect(message).toContain(LEGACY_AGENTLESS_WRITE_DEPRECATION_MARKER);
    expect(message).toContain('create package policy');
  });
});

describe('isManagedBulkEnabled', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getConfig.mockReset();
  });

  it('should return false if managedOtlp url is absent and flag is false', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: { managedBulk: { enabled: false } },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({} as any);

    expect(isManagedBulkEnabled()).toBe(false);
  });

  it('should return false if managedOtlp url is absent and flag is true', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: { managedBulk: { enabled: true } },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({} as any);

    expect(isManagedBulkEnabled()).toBe(false);
  });

  it('should return false if managedOtlp url is present but flag is false', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: { managedBulk: { enabled: false } },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ managedOtlp: { url: 'https://managed-otlp.example.com' } } as any);

    expect(isManagedBulkEnabled()).toBe(false);
  });

  it('should return true if managedOtlp url is present and flag is true', () => {
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: { managedBulk: { enabled: true } },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ managedOtlp: { url: 'https://managed-otlp.example.com' } } as any);

    expect(isManagedBulkEnabled()).toBe(true);
  });
});

describe('getManagedBulkEndpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if managedOtlp url is absent', () => {
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({} as any);

    expect(getManagedBulkEndpoint()).toBeUndefined();
  });

  it('should append /_es to the managedOtlp url when present', () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ managedOtlp: { url: 'https://managed-otlp.example.com' } } as any);

    expect(getManagedBulkEndpoint()).toBe('https://managed-otlp.example.com/_es');
  });

  it('should strip a trailing slash before appending /_es', () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ managedOtlp: { url: 'https://managed-otlp.example.com/' } } as any);

    expect(getManagedBulkEndpoint()).toBe('https://managed-otlp.example.com/_es');
  });
});

describe('prependAgentlessApiBasePathToEndpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should prepend the agentless api base path to the endpoint with ess if in cloud', () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: false } as any);
    const agentlessConfig = {
      api: {
        url: 'https://agentless-api.com',
      },
    } as any;
    const endpoint = '/deployments';

    expect(prependAgentlessApiBasePathToEndpoint(agentlessConfig, endpoint)).toBe(
      'https://agentless-api.com/api/v1/ess/deployments'
    );
  });

  it('should prepend the agentless api base path to the endpoint with serverless if in serverless', () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: false, isServerlessEnabled: true } as any);
    const agentlessConfig = {
      api: {
        url: 'https://agentless-api.com',
      },
    } as any;
    const endpoint = '/deployments';

    expect(prependAgentlessApiBasePathToEndpoint(agentlessConfig, endpoint)).toBe(
      'https://agentless-api.com/api/v1/serverless/deployments'
    );
  });

  it('should prepend the agentless api base path to the endpoint with a dynamic path', () => {
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: false } as any);

    const agentlessConfig = {
      api: {
        url: 'https://agentless-api.com',
      },
    } as any;
    const endpoint = '/deployments/123';

    expect(prependAgentlessApiBasePathToEndpoint(agentlessConfig, endpoint)).toBe(
      'https://agentless-api.com/api/v1/ess/deployments/123'
    );
  });
});
