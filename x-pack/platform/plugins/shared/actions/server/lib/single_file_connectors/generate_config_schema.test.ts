/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { generateConfigSchema } from './generate_config_schema';

describe('generateConfigSchema', () => {
  it('returns schema with authType when base schema is provided', () => {
    const baseSchema = z.object({ apiUrl: z.string() });
    const result = generateConfigSchema(baseSchema);

    expect(result.schema).toBeDefined();
    const parsed = result.schema.parse({ apiUrl: 'https://example.com' });
    expect(parsed).toEqual({ apiUrl: 'https://example.com' });
  });

  it('allows optional authType in config', () => {
    const baseSchema = z.object({ apiUrl: z.string() });
    const result = generateConfigSchema(baseSchema);

    const withAuthType = result.schema.parse({
      apiUrl: 'https://example.com',
      authType: 'basic',
    });
    expect(withAuthType).toEqual({ apiUrl: 'https://example.com', authType: 'basic' });

    const withoutAuthType = result.schema.parse({ apiUrl: 'https://example.com' });
    expect(withoutAuthType).toEqual({ apiUrl: 'https://example.com' });
  });

  it('returns z.object with authType when schema is undefined', () => {
    const result = generateConfigSchema(undefined);

    const withAuthType = result.schema.parse({ authType: 'basic' });
    expect(withAuthType).toEqual({ authType: 'basic' });

    const withoutAuthType = result.schema.parse({});
    expect(withoutAuthType).toEqual({});
  });

  it('parses valid config with multiple fields', () => {
    const baseSchema = z.object({
      apiUrl: z.string(),
      timeout: z.number().optional(),
    });
    const result = generateConfigSchema(baseSchema);

    const parsed = result.schema.parse({
      apiUrl: 'https://api.example.com',
      timeout: 5000,
      authType: 'bearer',
    });
    expect(parsed).toEqual({
      apiUrl: 'https://api.example.com',
      timeout: 5000,
      authType: 'bearer',
    });
  });

  it('rejects invalid config with wrong types', () => {
    const baseSchema = z.object({ apiUrl: z.string() }).strict();
    const result = generateConfigSchema(baseSchema);

    expect(() => result.schema.parse({ apiUrl: 123 })).toThrow(/apiUrl|string|number/);
  });

  it('rejects config with missing required fields', () => {
    const baseSchema = z.object({ apiUrl: z.string() });
    const result = generateConfigSchema(baseSchema);

    expect(() => result.schema.parse({})).toThrow(/apiUrl|Required|undefined/);
  });

  it('rejects extra keys when base schema is strict', () => {
    const baseSchema = z.object({ apiUrl: z.string() }).strict();
    const result = generateConfigSchema(baseSchema);

    expect(() =>
      result.schema.parse({ apiUrl: 'https://example.com', unknownKey: 'value' })
    ).toThrow(/unknownKey|Unrecognized/);
  });
});
