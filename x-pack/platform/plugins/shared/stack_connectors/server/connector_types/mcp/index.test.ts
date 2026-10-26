/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { MCPConnectorConfig } from '@kbn/connector-schemas/mcp';
import { getMcpConnectorType } from '.';

const DISALLOWED_HOST = 'https://evil.example.com';

describe('getMcpConnectorType validators', () => {
  let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;

  const validateConfig = (config: MCPConnectorConfig) => {
    const connectorType = getMcpConnectorType({
      getClientLeasePool: jest.fn(),
    });
    const configValidator = connectorType.validators?.find(
      (validator) => validator.type === ValidatorType.CONFIG
    );

    if (!configValidator) {
      throw new Error('config validator missing');
    }

    configValidator.validator(config, { configurationUtilities });
  };

  beforeEach(() => {
    configurationUtilities = actionsConfigMock.create();
    configurationUtilities.ensureUriAllowed.mockImplementation((uri: string) => {
      if (uri.startsWith(DISALLOWED_HOST)) {
        throw new Error('target url is not present in allowedHosts');
      }
    });
  });

  const allowedOAuthConfig = (): MCPConnectorConfig => ({
    serverUrl: 'https://mcp.example.com',
    hasAuth: true,
    authType: MCPAuthType.OAuthAuthorizationCode,
    authorizationUrl: 'https://idp.example.com/authorize',
    tokenUrl: 'https://idp.example.com/token',
    clientId: 'client-id',
  });

  it('throws when an OAuth authorizationUrl is outside allowed hosts', () => {
    expect(() =>
      validateConfig({
        ...allowedOAuthConfig(),
        authorizationUrl: `${DISALLOWED_HOST}/authorize`,
      })
    ).toThrow(/error validating url: target url is not present in allowedHosts/);
  });

  it('throws when an OAuth tokenUrl is outside allowed hosts', () => {
    expect(() =>
      validateConfig({
        ...allowedOAuthConfig(),
        tokenUrl: `${DISALLOWED_HOST}/token`,
      })
    ).toThrow(/error validating url: target url is not present in allowedHosts/);
  });

  it('passes when OAuth URLs are allowed', () => {
    expect(() => validateConfig(allowedOAuthConfig())).not.toThrow();
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://mcp.example.com'
    );
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://idp.example.com/authorize'
    );
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://idp.example.com/token'
    );
  });

  it('still validates serverUrl', () => {
    expect(() =>
      validateConfig({
        serverUrl: `${DISALLOWED_HOST}/mcp`,
        hasAuth: false,
        authType: MCPAuthType.None,
      })
    ).toThrow(/error validating url: target url is not present in allowedHosts/);
  });

  it('skips OAuth URL checks for non-OAuth auth types', () => {
    expect(() =>
      validateConfig({
        serverUrl: 'https://mcp.example.com',
        hasAuth: true,
        authType: MCPAuthType.Bearer,
        authorizationUrl: `${DISALLOWED_HOST}/authorize`,
        tokenUrl: `${DISALLOWED_HOST}/token`,
      })
    ).not.toThrow();

    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledTimes(1);
    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(
      'https://mcp.example.com'
    );
  });
});
