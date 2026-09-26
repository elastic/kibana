/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { declarativeJsonSchemaToZod } from './json_schema';

describe('declarativeJsonSchemaToZod', () => {
  it('converts format ipv4 and rejects ipv6', () => {
    const schema = declarativeJsonSchemaToZod({ type: 'string', format: 'ipv4' }, 'input.ip');

    expect(schema.parse('8.8.8.8')).toBe('8.8.8.8');
    expect(() => schema.parse('::1')).toThrow();
    expect(() => schema.parse('not-an-ip')).toThrow();
  });

  it('converts format ipv6 and rejects ipv4', () => {
    const schema = declarativeJsonSchemaToZod({ type: 'string', format: 'ipv6' }, 'input.ip');

    expect(schema.parse('::1')).toBe('::1');
    expect(() => schema.parse('8.8.8.8')).toThrow();
  });

  it('enriches nested ipv4 properties', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        required: ['ipAddress'],
        properties: {
          ipAddress: { type: 'string', format: 'ipv4' },
        },
      },
      'actions.checkIp.input'
    );

    expect(schema.parse({ ipAddress: '1.1.1.1' })).toEqual({ ipAddress: '1.1.1.1' });
    expect(() => schema.parse({ ipAddress: 'not-an-ip' })).toThrow();
  });

  it('rejects unknown keys when additionalProperties is absent', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      },
      'config'
    );

    expect(schema.parse({ name: 'test' })).toEqual({ name: 'test' });
    expect(() => schema.parse({ name: 'test', extra: 1 })).toThrow();
  });

  it('preserves unknown keys when additionalProperties is true', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: true,
      },
      'config'
    );

    expect(schema.parse({ name: 'test', extra: 1 })).toEqual({ name: 'test', extra: 1 });
  });

  it('stores flat UI keys on z.globalRegistry', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
            format: 'uri',
            label: 'Base URL',
            placeholder: 'https://api.abuseipdb.com',
            helpText: 'Use the API host',
            validate: { allowedHosts: true },
          },
        },
      },
      'config'
    );

    expect(schema).toBeInstanceOf(z.ZodObject);
    const baseUrl = (schema as z.ZodObject).shape.baseUrl;
    expect(z.globalRegistry.get(baseUrl)).toEqual(
      expect.objectContaining({
        label: 'Base URL',
        placeholder: 'https://api.abuseipdb.com',
        helpText: 'Use the API host',
        validate: { allowedHosts: true },
      })
    );
  });

  it('unwraps xUi nested UI hints into flat global-registry meta', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
            format: 'uri',
            xUi: {
              label: 'Base URL',
              placeholder: 'https://api.abuseipdb.com',
              helpText: 'Use the API host',
              validate: { allowedHosts: true },
            },
          },
        },
      },
      'config'
    );

    expect(schema).toBeInstanceOf(z.ZodObject);
    const baseUrl = (schema as z.ZodObject).shape.baseUrl;
    expect(z.globalRegistry.get(baseUrl)).toEqual({
      label: 'Base URL',
      placeholder: 'https://api.abuseipdb.com',
      helpText: 'Use the API host',
      validate: { allowedHosts: true },
    });
    expect(z.globalRegistry.get(baseUrl)).not.toHaveProperty('xUi');
  });

  it('lets xUi keys win when both flat and nested hints are present', () => {
    const schema = declarativeJsonSchemaToZod(
      {
        type: 'object',
        properties: {
          baseUrl: {
            type: 'string',
            format: 'uri',
            label: 'Flat label',
            placeholder: 'flat-placeholder',
            xUi: {
              label: 'Nested label',
              placeholder: 'nested-placeholder',
              helpText: 'Use the API host',
              validate: { allowedHosts: true },
            },
          },
        },
      },
      'config'
    );

    const baseUrl = (schema as z.ZodObject).shape.baseUrl;
    expect(z.globalRegistry.get(baseUrl)).toEqual({
      label: 'Nested label',
      placeholder: 'nested-placeholder',
      helpText: 'Use the API host',
      validate: { allowedHosts: true },
    });
    expect(z.globalRegistry.get(baseUrl)).not.toHaveProperty('xUi');
  });

  it('throws with the schema path when conversion is unsupported', () => {
    expect(() =>
      declarativeJsonSchemaToZod({ type: 'string', pattern: '[' }, 'config.properties.baseUrl')
    ).toThrow('Unsupported JSON Schema at config.properties.baseUrl.');
  });
});
