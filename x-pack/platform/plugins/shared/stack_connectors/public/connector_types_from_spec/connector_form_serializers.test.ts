/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  createConnectorFormSerializer,
  createConnectorFormDeserializer,
} from './connector_form_serializers';

describe('createConnectorFormSerializer', () => {
  it('should copy authType from secrets to config', () => {
    const serializer = createConnectorFormSerializer();
    const formData = {
      config: { url: 'https://example.com' },
      secrets: { authType: 'basic', username: 'user', password: 'pass' },
    };

    const result = serializer(formData);

    expect(result.config.authType).toBe('basic');
    expect(result.secrets.authType).toBe('basic');
  });

  it('should return data unchanged when secrets.authType is missing', () => {
    const serializer = createConnectorFormSerializer();
    const formData = {
      config: { url: 'https://example.com' },
      secrets: {},
    };

    const result = serializer(formData);

    expect(result).toEqual(formData);
    expect(result.config.authType).toBeUndefined();
  });

  it('should overwrite existing config.authType if secrets.authType exists', () => {
    const serializer = createConnectorFormSerializer();
    const formData = {
      config: { url: 'https://example.com', authType: 'old' },
      secrets: { authType: 'bearer', token: 'xyz' },
    };

    const result = serializer(formData);

    expect(result.config.authType).toBe('bearer');
  });

  it('should handle undefined formData', () => {
    const serializer = createConnectorFormSerializer();

    const result = serializer(undefined);

    expect(result).toBeUndefined();
  });
});

describe('createConnectorFormDeserializer', () => {
  const commonApiData = {
    actionTypeId: 'test-connector',
    isDeprecated: false,
  };

  const createTestSchema = () => {
    return z.object({
      config: z.object({
        url: z.string(),
        authType: z.string().optional(),
      }),
      secrets: z.discriminatedUnion('authType', [
        z.object({ authType: z.literal('none') }),
        z.object({ authType: z.literal('basic'), username: z.string(), password: z.string() }),
        z.object({ authType: z.literal('bearer'), token: z.string() }),
      ]),
    });
  };

  it('should copy authType from config to secrets when editing', () => {
    const schema = createTestSchema();
    const deserializer = createConnectorFormDeserializer(schema);
    const apiData = {
      ...commonApiData,
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: {},
    };

    const result = deserializer(apiData);

    expect(result.secrets.authType).toBe('basic');
    expect(result.config.authType).toBe('basic');
  });

  it('should return data unchanged when config.authType is missing', () => {
    const schema = createTestSchema();
    const deserializer = createConnectorFormDeserializer(schema);
    const apiData = {
      ...commonApiData,
      config: { url: 'https://example.com' },
      secrets: {},
    };

    const result = deserializer(apiData);

    expect(result).toEqual(apiData);
    expect(result.secrets.authType).toBeUndefined();
  });

  it('should return data unchanged when secrets.authType already exists', () => {
    const schema = createTestSchema();
    const deserializer = createConnectorFormDeserializer(schema);
    const apiData = {
      ...commonApiData,
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: { authType: 'bearer', token: 'xyz' },
    };

    const result = deserializer(apiData);

    expect(result).toEqual(apiData);
    expect(result.secrets.authType).toBe('bearer');
  });

  it('should handle schema without discriminated union gracefully', () => {
    const schema = z.object({
      config: z.object({ url: z.string() }),
      secrets: z.object({ token: z.string() }),
    });
    const deserializer = createConnectorFormDeserializer(schema);
    const apiData = {
      ...commonApiData,
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: {},
    };

    const result = deserializer(apiData);

    expect(result).toEqual(apiData);
  });

  it('should handle errors', () => {
    const invalidSchema = {} as z.ZodObject<z.ZodRawShape>;
    const deserializer = createConnectorFormDeserializer(invalidSchema);
    const apiData = {
      ...commonApiData,
      config: { url: 'https://example.com', authType: 'basic' },
      secrets: {},
    };

    const result = deserializer(apiData);

    expect(result).toEqual(apiData);
  });
});
