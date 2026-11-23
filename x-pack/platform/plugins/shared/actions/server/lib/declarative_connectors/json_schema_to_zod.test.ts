/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromConnectorSpecSchema, getMeta } from '@kbn/connector-specs';
import { serializeConnectorSpec } from '@kbn/connector-specs/src/lib/serialize_connector_spec';
import { z } from '@kbn/zod/v4';
import type { DeclarativeConnectorSpec, DeclarativeJsonSchema } from './types';
import { loadFixture } from './__fixtures__/load_fixture';
import { declarativeJsonSchemaToZod } from './json_schema_to_zod';
import { materializeDeclarativeConnectorSpec } from './materialize_declarative_connector_spec';
import { parseDeclarativeConnectorSpec } from './parse_declarative_connector_spec';

describe('declarativeJsonSchemaToZod', () => {
  const connector = parseDeclarativeConnectorSpec(loadFixture('abuseipdb-1.1.0.yaml'));

  it('converts checkIp input, applies defaults, and rejects unknown or out-of-range values', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.checkIp.input);

    expect(schema.parse({ ipAddress: '1.2.3.4' })).toEqual({
      ipAddress: '1.2.3.4',
      maxAgeInDays: 90,
      verbose: false,
    });
    expect(() => schema.parse({ ipAddress: '1.2.3.4', extra: true })).toThrow();
    expect(() => schema.parse({ ipAddress: '1.2.3.4', maxAgeInDays: 0 })).toThrow();
  });

  it('enforces the checkIp maxAgeInDays maximum', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.checkIp.input);

    expect(schema.parse({ ipAddress: '1.2.3.4', maxAgeInDays: 365 })).toEqual(
      expect.objectContaining({ maxAgeInDays: 365 })
    );
    expect(() => schema.parse({ ipAddress: '1.2.3.4', maxAgeInDays: 366 })).toThrow();
  });

  it('enforces the reportIp comment maxLength', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.reportIp.input);
    const input = { ip: '1.2.3.4', categories: [18] };

    expect(schema.parse({ ...input, comment: 'a'.repeat(1024) })).toEqual(
      expect.objectContaining({ comment: 'a'.repeat(1024) })
    );
    expect(() => schema.parse({ ...input, comment: 'a'.repeat(1025) })).toThrow();
  });

  it('enforces enum and minLength keywords', () => {
    const jsonSchema: DeclarativeJsonSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['mode', 'name'],
      properties: {
        mode: { type: 'string', enum: ['fast', 'slow'] },
        name: { type: 'string', minLength: 2 },
      },
    };
    const schema = declarativeJsonSchemaToZod(jsonSchema);

    expect(schema.parse({ mode: 'fast', name: 'ab' })).toEqual({ mode: 'fast', name: 'ab' });
    expect(() => schema.parse({ mode: 'other', name: 'ab' })).toThrow();
    expect(() => schema.parse({ mode: 'fast', name: 'a' })).toThrow();
  });

  it('combines enum values with string and numeric constraints', () => {
    const schema = declarativeJsonSchemaToZod({
      type: 'object',
      additionalProperties: false,
      required: ['name', 'count'],
      properties: {
        name: { type: 'string', enum: ['a', 'abc'], minLength: 2, maxLength: 3 },
        count: { type: 'integer', enum: [1, 5, 10], minimum: 2, maximum: 9 },
      },
    });

    expect(schema.parse({ name: 'abc', count: 5 })).toEqual({ name: 'abc', count: 5 });
    expect(() => schema.parse({ name: 'a', count: 5 })).toThrow();
    expect(() => schema.parse({ name: 'abc', count: 1 })).toThrow();
    expect(() => schema.parse({ name: 'toolong', count: 5 })).toThrow();
    const enumWithoutAllowedValues = declarativeJsonSchemaToZod({
      type: 'string',
      enum: ['too-long'],
      maxLength: 4,
    });
    expect(enumWithoutAllowedValues.safeParse('too-long').success).toBe(false);
    expect(enumWithoutAllowedValues.safeParse('short').success).toBe(false);
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
    expect(jsonSchema).toContain('"enum":["abc"]');
    expect(jsonSchema).not.toContain('"allOf"');
  });

  it('combines URI, IPv4, and date-time formats with supported constraints', () => {
    const schema = declarativeJsonSchemaToZod({
      type: 'object',
      additionalProperties: false,
      required: ['url', 'ip', 'timestamp'],
      properties: {
        url: { type: 'string', format: 'uri', minLength: 8, maxLength: 12 },
        ip: { type: 'string', format: 'ipv4', enum: ['1.2.3.4', 'not-ip'] },
        timestamp: {
          type: 'string',
          format: 'date-time',
          enum: ['2024-01-01T00:00:00Z', 'not-a-date'],
          minLength: 20,
        },
      },
    });

    expect(
      schema.parse({ url: 'https://a.co', ip: '1.2.3.4', timestamp: '2024-01-01T00:00:00Z' })
    ).toEqual({ url: 'https://a.co', ip: '1.2.3.4', timestamp: '2024-01-01T00:00:00Z' });
    expect(
      z.toJSONSchema(declarativeJsonSchemaToZod({ type: 'string', format: 'uri', maxLength: 12 }))
    ).toMatchObject({ type: 'string', format: 'uri', maxLength: 12 });
    const ipv4Schema = declarativeJsonSchemaToZod({
      type: 'string',
      format: 'ipv4',
      minLength: 7,
      maxLength: 15,
    });
    expect(ipv4Schema.parse('255.255.255.255')).toBe('255.255.255.255');
    expect(() => ipv4Schema.parse('256.1.1.1')).toThrow();
    expect(z.toJSONSchema(ipv4Schema)).toMatchObject({
      type: 'string',
      format: 'ipv4',
      minLength: 7,
      maxLength: 15,
    });
    expect(() =>
      schema.parse({ url: 'https://a.co/long', ip: '1.2.3.4', timestamp: '2024-01-01T00:00:00Z' })
    ).toThrow();
    expect(() =>
      schema.parse({ url: 'https://a.co', ip: 'not-ip', timestamp: '2024-01-01T00:00:00Z' })
    ).toThrow();
    expect(() =>
      schema.parse({ url: 'https://a.co', ip: '1.2.3.4', timestamp: 'not-a-date' })
    ).toThrow();
  });

  it('preserves descriptions after optional and default wrappers', () => {
    const schema = declarativeJsonSchemaToZod({
      type: 'object',
      description: 'Root description',
      properties: {
        optional: { type: 'string', description: 'Optional field description' },
        defaulted: {
          type: 'string',
          description: 'Default field description',
          default: 'value',
        },
        nested: {
          type: 'array',
          description: 'Array description',
          items: { type: 'object', description: 'Item description' },
        },
      },
    }) as z.ZodObject;

    expect(schema.description).toBe('Root description');
    expect(schema.shape.optional.description).toBe('Optional field description');
    expect(schema.shape.defaulted.description).toBe('Default field description');
    expect(schema.shape.nested.description).toBe('Array description');
    expect(
      (((schema.shape.nested as z.ZodOptional).unwrap() as z.ZodArray).element as z.ZodObject)
        .description
    ).toBe('Item description');
  });

  it('preserves additional properties when additionalProperties is omitted', () => {
    const schema = declarativeJsonSchemaToZod({
      type: 'object',
      properties: {
        nested: { type: 'object', properties: { known: { type: 'boolean' } } },
      },
    });

    expect(schema.parse({ extra: 'preserved', nested: { known: true, other: 42 } })).toEqual({
      extra: 'preserved',
      nested: { known: true, other: 42 },
    });
  });

  it('round-trips constrained enum config fields as enums with metadata and defaults', () => {
    const connectorWithEnum: DeclarativeConnectorSpec = {
      ...connector,
      config: {
        ...connector.config,
        properties: {
          ...connector.config.properties,
          environment: {
            type: 'string',
            enum: ['dev', 'prod', 'production'],
            minLength: 3,
            maxLength: 4,
            default: 'dev',
            description: 'Deployment environment',
            meta: { label: 'Environment' },
          } satisfies DeclarativeJsonSchema,
        },
      },
    };
    const materialized = materializeDeclarativeConnectorSpec(connectorWithEnum);
    const serialized = serializeConnectorSpec(materialized);
    const restored = fromConnectorSpecSchema(JSON.parse(JSON.stringify(serialized.schema)));

    expect(restored).toBeDefined();
    if (!restored) {
      throw new Error('Connector spec schema did not restore.');
    }
    const configSchema = restored.shape.config;
    const environmentSchema = (configSchema.shape.environment as z.ZodDefault).unwrap();
    expect(environmentSchema).toBeInstanceOf(z.ZodEnum);
    expect((environmentSchema as z.ZodEnum).options).toEqual(['dev', 'prod']);
    expect(getMeta(environmentSchema as z.ZodType).label).toBe('Environment');
    expect(configSchema.parse({})).toEqual(expect.objectContaining({ environment: 'dev' }));
    expect(() => configSchema.parse({ environment: 'production' })).toThrow();
  });

  it('converts reportIp categories to an array of integers', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.reportIp.input);

    expect(schema.parse({ ip: '1.2.3.4', categories: [18, 22] })).toEqual({
      ip: '1.2.3.4',
      categories: [18, 22],
    });
    expect(() => schema.parse({ ip: '1.2.3.4', categories: [1.5] })).toThrow();
  });

  it('applies the config baseUrl default', () => {
    const schema = declarativeJsonSchemaToZod(connector.config);

    expect(schema.parse({})).toEqual({ baseUrl: 'http://127.0.0.1:8090' });
  });

  it('copies meta onto config fields, including allowed hosts', () => {
    const schema = declarativeJsonSchemaToZod(connector.config) as z.ZodObject;

    expect(getMeta(schema.shape.baseUrl)).toEqual(
      expect.objectContaining({
        label: 'Base URL',
        placeholder: 'https://api.abuseipdb.com',
        helpText:
          'Use the local mock URL for the PoC or https://api.abuseipdb.com for live testing.',
        validate: { allowedHosts: true },
      })
    );
    expect(schema.shape.baseUrl.description).toBe('AbuseIPDB API base URL');
  });

  it('rejects a non-IPv4 ipAddress and accepts a valid one', () => {
    const schema = declarativeJsonSchemaToZod(connector.actions.checkIp.input);

    expect(() => schema.parse({ ipAddress: 'not-an-ip' })).toThrow();
    expect(schema.parse({ ipAddress: '1.2.3.4' })).toEqual(
      expect.objectContaining({ ipAddress: '1.2.3.4' })
    );
  });
});
