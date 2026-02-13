/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { Config } from '@kbn/connector-schemas/mcp';
import { API_KEY_URL_PLACEHOLDER, MCPAuthType } from '@kbn/connector-schemas/mcp';
import { formDeserializer, formSerializer } from './serialization';
import { HeaderFieldType, type MCPInternalConnectorForm } from '../types';

describe('serialization utils', () => {
  describe('formSerializer', () => {
    it('should substitute {{apiKey}} in serverUrl with token and set hasAuth false when authType is ApiKeyInUrl', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: `https://mcp.example.com/${API_KEY_URL_PLACEHOLDER}/v2/mcp`,
          hasAuth: true,
          authType: MCPAuthType.ApiKeyInUrl,
        },
        secrets: { token: 'my-api-key-123' },
        __internal__: { headers: [] },
      };

      expect(formSerializer(formData)).toEqual({
        ...formData,
        config: {
          ...formData.config,
          serverUrl: 'https://mcp.example.com/my-api-key-123/v2/mcp',
          hasAuth: false,
          headers: undefined,
        },
        secrets: {
          secretHeaders: undefined,
        },
      });
    });

    it('should substitute {{apiKey}} with apiKey secret when token is empty and authType is ApiKeyInUrl', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: `https://mcp.example.com/${API_KEY_URL_PLACEHOLDER}/v2/mcp`,
          hasAuth: true,
          authType: MCPAuthType.ApiKeyInUrl,
        },
        secrets: { apiKey: 'key-from-api-key-field' },
        __internal__: { headers: [] },
      };

      expect(formSerializer(formData)).toEqual({
        ...formData,
        config: {
          ...formData.config,
          serverUrl: 'https://mcp.example.com/key-from-api-key-field/v2/mcp',
          hasAuth: false,
          headers: undefined,
        },
        secrets: {
          secretHeaders: undefined,
        },
      });
    });

    it('should not substitute when authType is Bearer even if serverUrl contains placeholder', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: `https://mcp.example.com/${API_KEY_URL_PLACEHOLDER}/v2/mcp`,
          hasAuth: true,
          authType: MCPAuthType.Bearer,
        },
        secrets: { token: 'my-token' },
        __internal__: { headers: [] },
      };

      const result = formSerializer(formData);

      expect(result.config?.serverUrl).toBe(`https://mcp.example.com/${API_KEY_URL_PLACEHOLDER}/v2/mcp`);
      expect(result.config?.hasAuth).toBe(true);
    });

    it('should not substitute when serverUrl has no placeholder (existing behavior)', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: 'https://example.com',
        },
        secrets: { token: 'ignored' },
        __internal__: { headers: [] },
      };

      expect(formSerializer(formData)).toEqual({
        ...formData,
        config: {
          serverUrl: 'https://example.com',
          headers: undefined,
        },
        secrets: {
          secretHeaders: undefined,
        },
      });
    });

    it('should separate config and secret headers', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: 'https://example.com',
        },
        secrets: {},
        __internal__: {
          headers: [
            { key: 'config-key', value: 'a', type: HeaderFieldType.CONFIG },
            { key: 'secret-key', value: 'b', type: HeaderFieldType.SECRET },
          ],
        },
      };

      expect(formSerializer(formData)).toEqual({
        ...formData,
        config: {
          serverUrl: 'https://example.com',
          headers: { 'config-key': 'a' },
        },
        secrets: {
          secretHeaders: { 'secret-key': 'b' },
        },
      });
    });

    it('should omit empty headers', () => {
      const formData: MCPInternalConnectorForm = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: 'https://example.com',
        },
        secrets: {},
        __internal__: {
          headers: [],
        },
      };

      expect(formSerializer(formData)).toEqual({
        ...formData,
        config: {
          serverUrl: 'https://example.com',
          headers: undefined,
        },
        secrets: {
          secretHeaders: undefined,
        },
      });
    });
  });

  describe('formDeserializer', () => {
    it('should restore headers to __internal__ and config', () => {
      const connectorData: ConnectorFormSchema<Config> = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: 'https://example.com',
          headers: {
            foo: 'bar',
          },
        },
        secrets: {},
      };

      const result = formDeserializer(connectorData);

      expect(result.config.headers).toEqual([
        { key: 'foo', value: 'bar', type: HeaderFieldType.CONFIG },
      ]);
      expect(result.__internal__).toEqual({
        headers: [{ key: 'foo', value: 'bar', type: HeaderFieldType.CONFIG }],
        hasHeaders: true,
      });
    });

    it('should handle missing headers', () => {
      const connectorData: ConnectorFormSchema<Config> = {
        actionTypeId: '.mcp',
        isDeprecated: false,
        config: {
          serverUrl: 'https://example.com',
        },
        secrets: {},
      };

      const result = formDeserializer(connectorData);

      expect(result.config.headers).toBeUndefined();
      expect(result.__internal__).toEqual({
        headers: [],
        hasHeaders: false,
      });
    });
  });
});
