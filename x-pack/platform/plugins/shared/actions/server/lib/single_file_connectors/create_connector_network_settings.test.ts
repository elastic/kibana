/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('node:dns/promises', () => ({
  resolveSrv: jest.fn(),
}));

jest.mock('@kbn/actions-utils', () => ({
  getNodeSSLOptions: jest.fn(),
}));

import { resolveSrv } from 'node:dns/promises';
import { getNodeSSLOptions } from '@kbn/actions-utils';
import { createConnectorNetworkSettings } from './create_connector_network_settings';
import { AllowlistDeniedError } from './connector_network_errors';
import type { ActionsConfigurationUtilities } from '../../actions_config';

const mockResolveSrv = resolveSrv as jest.Mock;
const mockGetNodeSSLOptions = getNodeSSLOptions as jest.Mock;

describe('createConnectorNetworkSettings', () => {
  const mockConfigUtils = {
    ensureUriAllowed: jest.fn(),
    ensureHostnameAllowed: jest.fn(),
    getSSLSettings: jest.fn(),
    getProxySettings: jest.fn(),
    getCustomHostSettings: jest.fn(),
    getResponseSettings: jest.fn(),
  } as unknown as ActionsConfigurationUtilities;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the complete network policy surface', () => {
    const network = createConnectorNetworkSettings(mockConfigUtils);
    expect(Object.keys(network).sort()).toEqual([
      'ensureHostnameAllowed',
      'ensureUriAllowed',
      'getCustomHostSettings',
      'getProxySettings',
      'getResponseSettings',
      'getSslSettings',
      'getTlsOptions',
      'resolveSrvHosts',
    ]);
  });

  it('delegates ensureUriAllowed to configUtils', () => {
    const network = createConnectorNetworkSettings(mockConfigUtils);
    network.ensureUriAllowed('https://allowed.example.com');
    expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith('https://allowed.example.com');
  });

  it('delegates ensureHostnameAllowed to configUtils', () => {
    const network = createConnectorNetworkSettings(mockConfigUtils);
    network.ensureHostnameAllowed('allowed.example.com');
    expect(mockConfigUtils.ensureHostnameAllowed).toHaveBeenCalledWith('allowed.example.com');
  });

  it('wraps an ensureUriAllowed denial in AllowlistDeniedError, preserving message and cause', () => {
    const original = new Error('URI not allowed');
    (mockConfigUtils.ensureUriAllowed as jest.Mock).mockImplementation(() => {
      throw original;
    });
    const network = createConnectorNetworkSettings(mockConfigUtils);

    const thrown = (() => {
      try {
        network.ensureUriAllowed('https://denied.example.com');
      } catch (e) {
        return e;
      }
    })();

    expect(thrown).toBeInstanceOf(AllowlistDeniedError);
    expect((thrown as Error).message).toBe('URI not allowed');
    expect((thrown as Error).cause).toBe(original);
  });

  it('wraps an ensureHostnameAllowed denial in AllowlistDeniedError', () => {
    (mockConfigUtils.ensureHostnameAllowed as jest.Mock).mockImplementation(() => {
      throw new Error('hostname not allowed');
    });
    const network = createConnectorNetworkSettings(mockConfigUtils);

    expect(() => network.ensureHostnameAllowed('denied.example.com')).toThrow(AllowlistDeniedError);
    expect(() => network.ensureHostnameAllowed('denied.example.com')).toThrow(
      'hostname not allowed'
    );
  });

  it('resolves SRV records for the default (mongodb) service name', async () => {
    const records = [{ name: 'shard1.example.com', port: 27017, priority: 0, weight: 0 }];
    mockResolveSrv.mockResolvedValue(records);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    const result = await network.resolveSrvHosts('cluster0.example.com');

    expect(mockResolveSrv).toHaveBeenCalledWith('_mongodb._tcp.cluster0.example.com');
    expect(result).toBe(records);
  });

  it('resolves SRV records for a custom service name', async () => {
    mockResolveSrv.mockResolvedValue([]);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    await network.resolveSrvHosts('cluster0.example.com', 'customname');

    expect(mockResolveSrv).toHaveBeenCalledWith('_customname._tcp.cluster0.example.com');
  });

  it('propagates SRV resolution failures', async () => {
    mockResolveSrv.mockRejectedValue(new Error('ENOTFOUND'));
    const network = createConnectorNetworkSettings(mockConfigUtils);

    await expect(network.resolveSrvHosts('cluster0.example.com')).rejects.toThrow('ENOTFOUND');
  });

  it('delegates getSslSettings and re-reads current settings', () => {
    const firstValue = { verificationMode: 'full' as const };
    const secondValue = { verificationMode: 'none' as const };
    (mockConfigUtils.getSSLSettings as jest.Mock)
      .mockReturnValueOnce(firstValue)
      .mockReturnValueOnce(secondValue);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    expect(network.getSslSettings()).toBe(firstValue);
    expect(network.getSslSettings()).toBe(secondValue);
    expect(mockConfigUtils.getSSLSettings).toHaveBeenCalledTimes(2);
  });

  it('delegates getProxySettings and re-reads current settings', () => {
    const firstValue = { proxyUrl: 'https://proxy-one.example.com' };
    const secondValue = { proxyUrl: 'https://proxy-two.example.com' };
    (mockConfigUtils.getProxySettings as jest.Mock)
      .mockReturnValueOnce(firstValue)
      .mockReturnValueOnce(secondValue);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    expect(network.getProxySettings()).toBe(firstValue);
    expect(network.getProxySettings()).toBe(secondValue);
    expect(mockConfigUtils.getProxySettings).toHaveBeenCalledTimes(2);
  });

  it('delegates getCustomHostSettings for each URL and re-reads current settings', () => {
    const firstValue = { ca: 'first' };
    const secondValue = { ca: 'second' };
    (mockConfigUtils.getCustomHostSettings as jest.Mock)
      .mockReturnValueOnce(firstValue)
      .mockReturnValueOnce(secondValue);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    expect(network.getCustomHostSettings('https://example.com')).toBe(firstValue);
    expect(network.getCustomHostSettings('https://example.com')).toBe(secondValue);
    expect(mockConfigUtils.getCustomHostSettings).toHaveBeenNthCalledWith(1, 'https://example.com');
    expect(mockConfigUtils.getCustomHostSettings).toHaveBeenNthCalledWith(2, 'https://example.com');
  });

  it('delegates getResponseSettings and re-reads current settings', () => {
    const firstValue = { timeout: 1000, maxContentLength: 100 };
    const secondValue = { timeout: 2000, maxContentLength: 200 };
    (mockConfigUtils.getResponseSettings as jest.Mock)
      .mockReturnValueOnce(firstValue)
      .mockReturnValueOnce(secondValue);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    expect(network.getResponseSettings()).toBe(firstValue);
    expect(network.getResponseSettings()).toBe(secondValue);
    expect(mockConfigUtils.getResponseSettings).toHaveBeenCalledTimes(2);
  });

  it('delegates getTlsOptions to getNodeSSLOptions', () => {
    const logger = { warn: jest.fn() } as unknown as Parameters<typeof getNodeSSLOptions>[0];
    const sslOverrides = { verificationMode: 'full' as const };
    const tlsOptions = { rejectUnauthorized: true };
    mockGetNodeSSLOptions.mockReturnValue(tlsOptions);
    const network = createConnectorNetworkSettings(mockConfigUtils);

    const result = network.getTlsOptions(logger, 'full', sslOverrides);

    expect(mockGetNodeSSLOptions).toHaveBeenCalledWith(logger, 'full', sslOverrides);
    expect(result).toBe(tlsOptions);
  });
});
