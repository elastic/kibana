/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConnectorNetworkSettings,
  AllowlistDeniedError,
} from './create_connector_network_settings';
import type { ActionsConfigurationUtilities } from '../../actions_config';

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
