/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConnectorNetwork } from './create_connector_network';
import type { ActionsConfigurationUtilities } from '../../actions_config';

describe('createConnectorNetwork', () => {
  const mockConfigUtils = {
    ensureUriAllowed: jest.fn(),
    ensureHostnameAllowed: jest.fn(),
  } as unknown as ActionsConfigurationUtilities;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an object with exactly ensureUriAllowed and ensureHostnameAllowed', () => {
    const network = createConnectorNetwork(mockConfigUtils);
    expect(Object.keys(network).sort()).toEqual(['ensureHostnameAllowed', 'ensureUriAllowed']);
  });

  it('delegates ensureUriAllowed to configUtils', () => {
    const network = createConnectorNetwork(mockConfigUtils);
    network.ensureUriAllowed('https://allowed.example.com');
    expect(mockConfigUtils.ensureUriAllowed).toHaveBeenCalledWith('https://allowed.example.com');
  });

  it('delegates ensureHostnameAllowed to configUtils', () => {
    const network = createConnectorNetwork(mockConfigUtils);
    network.ensureHostnameAllowed('allowed.example.com');
    expect(mockConfigUtils.ensureHostnameAllowed).toHaveBeenCalledWith('allowed.example.com');
  });

  it('propagates errors from ensureUriAllowed', () => {
    (mockConfigUtils.ensureUriAllowed as jest.Mock).mockImplementation(() => {
      throw new Error('URI not allowed');
    });
    const network = createConnectorNetwork(mockConfigUtils);
    expect(() => network.ensureUriAllowed('https://denied.example.com')).toThrow('URI not allowed');
  });

  it('propagates errors from ensureHostnameAllowed', () => {
    (mockConfigUtils.ensureHostnameAllowed as jest.Mock).mockImplementation(() => {
      throw new Error('hostname not allowed');
    });
    const network = createConnectorNetwork(mockConfigUtils);
    expect(() => network.ensureHostnameAllowed('denied.example.com')).toThrow(
      'hostname not allowed'
    );
  });
});
