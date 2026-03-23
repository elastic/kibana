/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import { generateSchema } from './generate_schema';
import type { ConnectorSpec } from '@kbn/connector-specs';

describe('generateSchema', () => {
  it('generates schema with config and secrets', () => {
    const schema = generateSchema({
      schema: z4.object({
        url: z4.string().min(1),
      }),
      auth: {
        types: [
          'basic',
          {
            type: 'api_key_header',
            defaults: {
              headerField: 'custom-api-key-field',
            },
          },
        ],
      },
    } as unknown as ConnectorSpec);

    expect(z4.toJSONSchema(schema)).toMatchSnapshot();
  });

  it('filters auth types based on explicit authMode', () => {
    const spec = {
      schema: z4.object({
        url: z4.string().min(1),
      }),
      auth: {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },
    } as unknown as ConnectorSpec;

    const schemaWithSharedAuth = generateSchema(spec, { authMode: 'shared' });
    const sharedJsonSchema = z4.toJSONSchema(schemaWithSharedAuth) as any;
    const sharedAuthTypes = (sharedJsonSchema.properties?.secrets?.anyOf || [])
      .map((opt: any) => opt.properties?.authType?.const)
      .filter(Boolean);

    expect(sharedAuthTypes).toContain('basic');
    expect(sharedAuthTypes).toContain('bearer');
    expect(sharedAuthTypes).not.toContain('oauth_authorization_code');
  });

  it('includes all auth types when no authMode is specified', () => {
    const spec = {
      schema: z4.object({
        url: z4.string().min(1),
      }),
      auth: {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },
    } as unknown as ConnectorSpec;

    const schema = generateSchema(spec);
    const jsonSchema = z4.toJSONSchema(schema) as any;
    const authTypes = (jsonSchema.properties?.secrets?.anyOf || [])
      .map((opt: any) => opt.properties?.authType?.const)
      .filter(Boolean);

    expect(authTypes).toContain('basic');
    expect(authTypes).toContain('bearer');
    expect(authTypes).toContain('oauth_authorization_code');
  });

  it('filters to per-user auth types when authMode is per-user', () => {
    const spec = {
      schema: z4.object({
        url: z4.string().min(1),
      }),
      auth: {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },
    } as unknown as ConnectorSpec;

    const schema = generateSchema(spec, { authMode: 'per-user' });
    const jsonSchema = z4.toJSONSchema(schema) as any;
    const authTypes = (jsonSchema.properties?.secrets?.anyOf || [])
      .map((opt: any) => opt.properties?.authType?.const)
      .filter(Boolean);

    expect(authTypes).toContain('oauth_authorization_code');
    expect(authTypes).not.toContain('basic');
    expect(authTypes).not.toContain('bearer');
  });
});
