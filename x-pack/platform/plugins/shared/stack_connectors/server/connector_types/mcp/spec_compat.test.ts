/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { urlAllowListValidator } from '@kbn/actions-plugin/server';
import { buildValidators } from '@kbn/actions-plugin/server/sub_action_framework/validators';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import { z } from '@kbn/zod';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import {
  MCPAuthType,
  MCPConnectorConfigSchema,
  MCPConnectorSecretsSchema,
} from '@kbn/connector-schemas/mcp';
import type { MCPConnectorConfig, MCPConnectorSecrets } from '@kbn/connector-schemas/mcp';
import { mcpConnectorSpec } from '@kbn/connector-specs/server';
import { buildHeadersFromSecrets } from './auth_helpers';
import { getMcpConnectorType } from '.';

describe('mcp spec stack compat validators', () => {
  const configurationUtilities = actionsConfigMock.create();
  const actions = actionsMock.createSetup();
  const connectorType = createConnectorTypeFromSpec(mcpConnectorSpec, actions);
  const validatorServices = { configurationUtilities };

  const fixtures: Array<{
    name: string;
    config: MCPConnectorConfig;
    secrets: MCPConnectorSecrets;
  }> = [
    {
      name: 'none',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: true, authType: MCPAuthType.None },
      secrets: {},
    },
    {
      name: 'bearer',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: true, authType: MCPAuthType.Bearer },
      secrets: { token: 'token' },
    },
    {
      name: 'apiKey default header',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: true, authType: MCPAuthType.ApiKey },
      secrets: { apiKey: 'key' },
    },
    {
      name: 'apiKey template',
      config: {
        serverUrl: 'https://example.com/mcp',
        hasAuth: true,
        authType: MCPAuthType.ApiKey,
        apiKeyHeaderName: 'Authorization',
        apiKeyHeaderValue: 'Token token={{apiKey}}',
      },
      secrets: { apiKey: 'key' },
    },
    {
      name: 'basic',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: true, authType: MCPAuthType.Basic },
      secrets: { user: 'user', password: 'pass' },
    },
    {
      name: 'secretHeaders only',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: true },
      secrets: { secretHeaders: { 'X-Secret': 's' } },
    },
    {
      name: 'hasAuth false with headers',
      config: {
        serverUrl: 'https://example.com/mcp',
        hasAuth: false,
        headers: { 'X-Trace': '1' },
      },
      secrets: {},
    },
    {
      name: 'empty secrets',
      config: { serverUrl: 'https://example.com/mcp', hasAuth: false },
      secrets: {},
    },
  ];

  it.each(fixtures)('accepts legacy $name config and secrets', ({ config, secrets }) => {
    expect(connectorType.validate.config.schema.parse(config)).toEqual(
      MCPConnectorConfigSchema.parse(config)
    );
    expect(connectorType.validate.secrets.schema.parse(secrets)).toEqual(
      MCPConnectorSecretsSchema.parse(secrets)
    );
  });

  it('strips unknown keys and accepts the public create payload', () => {
    const config = { serverUrl: 'https://example.com/mcp', hasAuth: false, extra: true };
    expect(connectorType.validate.config.schema.parse(config)).toEqual(
      MCPConnectorConfigSchema.parse(config)
    );
    expect(connectorType.validate.secrets.schema.parse({ unused: true })).toEqual(
      MCPConnectorSecretsSchema.parse({ unused: true })
    );
  });

  it('builds the same auth headers as the legacy merge', async () => {
    const config: MCPConnectorConfig = {
      serverUrl: 'https://example.com/mcp',
      hasAuth: true,
      authType: MCPAuthType.Bearer,
      headers: { Authorization: 'from-config', 'X-Custom': 'from-config' },
    };
    const secrets: MCPConnectorSecrets = {
      token: 'secret',
      secretHeaders: { 'X-Secret': 's' },
    };

    await expect(mcpConnectorSpec.stackCompat!.getAuthHeaders(config, secrets)).resolves.toEqual({
      ...config.headers,
      ...buildHeadersFromSecrets(secrets, config),
    });
  });

  it('rejects a disallowed serverUrl with the legacy allow-list message', () => {
    configurationUtilities.ensureUriAllowed.mockImplementation(() => {
      throw new Error('target url is not added to the Kibana config xpack.actions.allowedHosts');
    });
    const config = { serverUrl: 'https://not-allowed.example', hasAuth: false };

    expect(() => connectorType.validate.config.customValidator!(config, validatorServices)).toThrow(
      'error validating url: target url is not added to the Kibana config xpack.actions.allowedHosts'
    );
    expect(() => urlAllowListValidator('serverUrl')(config, validatorServices)).toThrow(
      'error validating url: target url is not added to the Kibana config xpack.actions.allowedHosts'
    );
  });

  it('keeps the public config, secrets, and params JSON schemas identical', () => {
    const legacy = buildValidators({
      connector: getMcpConnectorType({ getClientLeasePool: () => ({}) as never }),
      configurationUtilities,
    });
    const toJsonSchema = (schema: unknown) => {
      const { $schema, ...jsonSchema } = z.toJSONSchema(schema as z.ZodType, {
        unrepresentable: 'any',
        io: 'input',
      }) as Record<string, unknown>;
      return jsonSchema;
    };

    expect(toJsonSchema(connectorType.validate.config.schema)).toEqual(
      toJsonSchema(legacy.config.schema)
    );
    expect(toJsonSchema(connectorType.validate.secrets.schema)).toEqual(
      toJsonSchema(legacy.secrets.schema)
    );
    expect(toJsonSchema(connectorType.validate.params!.schema)).toEqual(
      toJsonSchema(legacy.params.schema)
    );
  });

  it('does not add description or isExperimental to the public type', () => {
    expect(connectorType.id).toBe('.mcp');
    expect(connectorType.name).toBe('MCP');
    expect(connectorType.source).toBe('stack');
    expect(connectorType.minimumLicenseRequired).toBe('enterprise');
    expect(connectorType.isTestable).toBe(false);
    expect(connectorType.description).toBeUndefined();
    expect(connectorType.isExperimental).toBeUndefined();
    expect(connectorType.getService).toBeUndefined();
  });
});
