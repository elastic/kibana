/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { Config } from '@kbn/connector-schemas/mcp';
import { formDeserializer, formSerializer } from './serialization';
import { HeaderFieldType, type MCPInternalConnectorForm } from '../types';

describe('serialization utils', () => {
  describe('formSerializer', () => {
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
