/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { actionsConfigMock } from '../../actions_config.mock';
import { generateSecretsSchema } from './generate_secrets_schema';

describe('generateSecretsSchema', () => {
  const configUtils = actionsConfigMock.create();

  beforeEach(() => {
    configUtils.getWebhookSettings.mockReturnValue({
      ssl: {
        pfx: {
          enabled: true,
        },
      },
    });
  });

  it('returns schema from generateSecretsSchemaFromSpec', () => {
    const authSpec: ConnectorSpec['auth'] = {
      types: ['none'],
    };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(result.schema).toBeDefined();
    expect(result.schema.parse({ authType: 'none' })).toEqual({ authType: 'none' });
  });

  it('passes isPfxEnabled from webhook settings to generateSecretsSchemaFromSpec', () => {
    configUtils.getWebhookSettings.mockReturnValue({
      ssl: {
        pfx: {
          enabled: false,
        },
      },
    });

    const authSpec: ConnectorSpec['auth'] = {
      types: ['none', 'basic'],
    };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(configUtils.getWebhookSettings).toHaveBeenCalled();
    expect(result.schema).toBeDefined();
  });

  it('parses valid secrets for none auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['none'] };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(result.schema.parse({ authType: 'none' })).toEqual({ authType: 'none' });
  });

  it('parses valid secrets for basic auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, configUtils);

    const secrets = { authType: 'basic' as const, username: 'testuser', password: 'testpass' };
    expect(result.schema.parse(secrets)).toEqual(secrets);
  });

  it('parses valid secrets for bearer auth type', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['bearer'] };
    const result = generateSecretsSchema(authSpec, configUtils);

    const secrets = { authType: 'bearer' as const, token: 'test-token' };
    expect(result.schema.parse(secrets)).toEqual(secrets);
  });

  it('rejects invalid secrets with wrong authType', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(() =>
      result.schema.parse({ authType: 'invalid_type', username: 'u', password: 'p' })
    ).toThrow();
  });

  it('rejects invalid secrets with missing required fields', () => {
    const authSpec: ConnectorSpec['auth'] = { types: ['basic'] };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(() => result.schema.parse({ authType: 'basic', username: 'testuser' })).toThrow(
      /password|Required/
    );
  });

  it('returns empty object schema when no auth types are provided', () => {
    const authSpec: ConnectorSpec['auth'] = { types: [] };
    const result = generateSecretsSchema(authSpec, configUtils);

    expect(result.schema.parse({})).toEqual({});
  });

  it('returns empty object schema when auth is undefined', () => {
    const result = generateSecretsSchema(
      undefined as unknown as ConnectorSpec['auth'],
      configUtils
    );

    expect(result.schema.parse({})).toEqual({});
  });
});
