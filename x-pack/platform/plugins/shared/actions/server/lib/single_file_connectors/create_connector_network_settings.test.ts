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
import type { Logger } from '@kbn/logging';
import {
  createConnectorNetworkSettings,
  createPlatformServices,
} from './create_connector_network_settings';
import { AllowlistDeniedError } from './connector_network_errors';
import type { ActionsConfigurationUtilities } from '../../actions_config';

const mockResolveSrv = resolveSrv as jest.Mock;
const mockGetNodeSSLOptions = getNodeSSLOptions as jest.Mock;

const makeConfigUtils = () =>
  ({
    ensureUriAllowed: jest.fn(),
    ensureHostnameAllowed: jest.fn(),
    getSSLSettings: jest.fn().mockReturnValue({ verificationMode: 'full' }),
    getProxySettings: jest.fn(),
    getCustomHostSettings: jest.fn().mockReturnValue(undefined),
    getResponseSettings: jest.fn(),
  } as unknown as ActionsConfigurationUtilities);

describe('createConnectorNetworkSettings', () => {
  let mockConfigUtils: ActionsConfigurationUtilities;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigUtils = makeConfigUtils();
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
});

describe('createPlatformServices', () => {
  let mockConfigUtils: ActionsConfigurationUtilities;
  const fakeLogger = { warn: jest.fn() } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigUtils = makeConfigUtils();
  });

  it('resolves SRV records using the provided service name', async () => {
    const records = [{ name: 'shard1.example.com', port: 27017, priority: 0, weight: 0 }];
    mockResolveSrv.mockResolvedValue(records);
    const platform = createPlatformServices(mockConfigUtils);

    const result = await platform.resolveSrvHosts('cluster0.example.com', 'mongodb');

    expect(mockResolveSrv).toHaveBeenCalledWith('_mongodb._tcp.cluster0.example.com');
    expect(result).toBe(records);
  });

  it('resolves SRV records for a custom service name', async () => {
    mockResolveSrv.mockResolvedValue([]);
    const platform = createPlatformServices(mockConfigUtils);

    await platform.resolveSrvHosts('cluster0.example.com', 'customname');

    expect(mockResolveSrv).toHaveBeenCalledWith('_customname._tcp.cluster0.example.com');
  });

  it('propagates SRV resolution failures', async () => {
    mockResolveSrv.mockRejectedValue(new Error('ENOTFOUND'));
    const platform = createPlatformServices(mockConfigUtils);

    await expect(platform.resolveSrvHosts('cluster0.example.com', 'mongodb')).rejects.toThrow(
      'ENOTFOUND'
    );
  });

  it('buildTlsOptions calls getNodeSSLOptions with global ssl when no per-host override', () => {
    const globalSsl = { verificationMode: 'full' as const };
    (mockConfigUtils.getSSLSettings as jest.Mock).mockReturnValue(globalSsl);
    const tlsResult = { rejectUnauthorized: true };
    mockGetNodeSSLOptions.mockReturnValue(tlsResult);
    const platform = createPlatformServices(mockConfigUtils);

    const result = platform.buildTlsOptions(
      [{ hostname: 'mongo.example.com', port: 27017 }],
      fakeLogger
    );

    expect(mockGetNodeSSLOptions).toHaveBeenCalledWith(fakeLogger, 'full', globalSsl);
    expect(result).toBe(tlsResult);
  });

  it('buildTlsOptions prefers customHostSettings verificationMode over global', () => {
    const globalSsl = { verificationMode: 'full' as const };
    const hostSsl = { verificationMode: 'none' as const };
    (mockConfigUtils.getSSLSettings as jest.Mock).mockReturnValue(globalSsl);
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockReturnValue({ ssl: hostSsl });
    mockGetNodeSSLOptions.mockReturnValue({});
    const platform = createPlatformServices(mockConfigUtils);

    platform.buildTlsOptions([{ hostname: 'mongo.example.com', port: 27017 }], fakeLogger);

    expect(mockGetNodeSSLOptions).toHaveBeenCalledWith(fakeLogger, 'none', globalSsl);
    expect(mockConfigUtils.getCustomHostSettings).toHaveBeenCalledWith(
      'https://mongo.example.com:27017'
    );
  });

  it('buildTlsOptions splices in certificateAuthoritiesData as ca when present', () => {
    const certData = Buffer.from('cert-data').toString('base64');
    const hostSsl = { verificationMode: 'full' as const, certificateAuthoritiesData: certData };
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockReturnValue({ ssl: hostSsl });
    const tlsResult = { rejectUnauthorized: true } as ReturnType<typeof getNodeSSLOptions>;
    mockGetNodeSSLOptions.mockReturnValue(tlsResult);
    const platform = createPlatformServices(mockConfigUtils);

    const result = platform.buildTlsOptions(
      [{ hostname: 'mongo.example.com', port: 27017 }],
      fakeLogger
    );

    expect(result.ca).toEqual(Buffer.from(certData));
  });

  it('buildTlsOptions uses a single custom host entry for multi-host URIs', () => {
    const hostSsl = { verificationMode: 'none' as const };
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockImplementation((url: string) =>
      url === 'https://rs0.example.com:27017' ? { ssl: hostSsl } : undefined
    );
    mockGetNodeSSLOptions.mockReturnValue({});
    const platform = createPlatformServices(mockConfigUtils);

    platform.buildTlsOptions(
      [
        { hostname: 'rs0.example.com', port: 27017 },
        { hostname: 'rs1.example.com', port: 27017 },
      ],
      fakeLogger
    );

    expect(mockGetNodeSSLOptions).toHaveBeenCalledWith(fakeLogger, 'none', expect.anything());
  });

  it('buildTlsOptions throws when multiple hosts have conflicting customHostSettings entries', () => {
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockImplementation((url: string) => {
      if (url === 'https://rs0.example.com:27017')
        return { ssl: { verificationMode: 'none' as const } };
      if (url === 'https://rs1.example.com:27017')
        return { ssl: { verificationMode: 'full' as const } };
      return undefined;
    });
    const platform = createPlatformServices(mockConfigUtils);

    expect(() =>
      platform.buildTlsOptions(
        [
          { hostname: 'rs0.example.com', port: 27017 },
          { hostname: 'rs1.example.com', port: 27017 },
        ],
        fakeLogger
      )
    ).toThrow('multiple hosts in the connection URI have conflicting');
  });

  it('buildTlsOptions throws when a per-host CA would only cover some members of a multi-host URI', () => {
    const certData = Buffer.from('custom-ca').toString('base64');
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockImplementation((url: string) =>
      url === 'https://rs0.example.com:27017'
        ? { ssl: { verificationMode: 'full' as const, certificateAuthoritiesData: certData } }
        : undefined
    );
    const platform = createPlatformServices(mockConfigUtils);

    expect(() =>
      platform.buildTlsOptions(
        [
          { hostname: 'rs0.example.com', port: 27017 },
          { hostname: 'rs1.example.com', port: 27017 },
        ],
        fakeLogger
      )
    ).toThrow('cannot be applied to only some members of a multi-host connection');
  });

  it('buildTlsOptions allows a per-host CA on a single-host connection', () => {
    const certData = Buffer.from('custom-ca').toString('base64');
    (mockConfigUtils.getCustomHostSettings as jest.Mock).mockReturnValue({
      ssl: { verificationMode: 'full' as const, certificateAuthoritiesData: certData },
    });
    const tlsResult = { rejectUnauthorized: true } as ReturnType<typeof getNodeSSLOptions>;
    mockGetNodeSSLOptions.mockReturnValue(tlsResult);
    const platform = createPlatformServices(mockConfigUtils);

    const result = platform.buildTlsOptions(
      [{ hostname: 'mongo.example.com', port: 27017 }],
      fakeLogger
    );

    expect(result.ca).toEqual(Buffer.from(certData));
  });
});
