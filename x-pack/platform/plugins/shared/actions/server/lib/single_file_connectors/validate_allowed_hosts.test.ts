/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDiscriminatedUnionVariantJsonSchemaNode,
  validateValueAgainstAllowedHostsJsonSchema,
} from './validate_allowed_hosts';

describe('validate_allowed_hosts', () => {
  describe('validateValueAgainstAllowedHostsJsonSchema', () => {
    it('calls ensureUriAllowed for uri formatted strings', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      validateValueAgainstAllowedHostsJsonSchema(
        { url: 'https://example.com' },
        {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
        },
        configurationUtilities as never
      );

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://example.com');
    });

    it('resolves $ref to validate uri formatted strings', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      const jsonSchema = {
        $defs: {
          Url: { type: 'string', format: 'uri' },
        },
        type: 'object',
        properties: {
          url: { $ref: '#/$defs/Url' },
        },
      };

      validateValueAgainstAllowedHostsJsonSchema(
        { url: 'https://example.com' },
        jsonSchema,
        configurationUtilities as never,
        jsonSchema
      );

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://example.com');
    });

    it('respects validate.allowedHosts=false on referenced schema nodes', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      const jsonSchema = {
        $defs: {
          Url: { type: 'string', format: 'uri', validate: { allowedHosts: false } },
        },
        type: 'object',
        properties: {
          url: { $ref: '#/$defs/Url' },
        },
      };

      validateValueAgainstAllowedHostsJsonSchema(
        { url: 'https://example.com' },
        jsonSchema,
        configurationUtilities as never,
        jsonSchema
      );

      expect(configurationUtilities.ensureUriAllowed).not.toHaveBeenCalled();
    });

    it('recurses into arrays and validates uri items', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      validateValueAgainstAllowedHostsJsonSchema(
        { urls: ['https://a.example.com', 'https://b.example.com'] },
        {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
            },
          },
        },
        configurationUtilities as never
      );

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://a.example.com');
      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://b.example.com');
    });

    it('supports opting out via validate.allowedHosts=false', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      validateValueAgainstAllowedHostsJsonSchema(
        { url: 'https://not-allowed.example.com' },
        {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              format: 'uri',
              validate: { allowedHosts: false },
            },
          },
        },
        configurationUtilities as never
      );

      expect(configurationUtilities.ensureUriAllowed).not.toHaveBeenCalled();
    });

    it('walks anyOf/oneOf/allOf branches', () => {
      const configurationUtilities = { ensureUriAllowed: jest.fn() };

      validateValueAgainstAllowedHostsJsonSchema(
        'https://example.com',
        {
          anyOf: [{ type: 'string', format: 'uri' }],
          oneOf: [{ type: 'string', format: 'uri' }],
          allOf: [{ type: 'string', format: 'uri' }],
        },
        configurationUtilities as never
      );

      expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('getDiscriminatedUnionVariantJsonSchemaNode', () => {
    it('returns the matching variant by discriminator const', () => {
      const variant = getDiscriminatedUnionVariantJsonSchemaNode(
        {
          anyOf: [
            {
              type: 'object',
              properties: { authType: { const: 'basic' } },
            },
            {
              type: 'object',
              properties: { authType: { const: 'oauth_authorization_code' } },
            },
          ],
        },
        'authType',
        'oauth_authorization_code'
      ) as { properties: { authType: { const: string } } };

      expect(variant.properties.authType.const).toBe('oauth_authorization_code');
    });

    it('resolves $ref variants', () => {
      const jsonSchema = {
        $defs: {
          basic: { type: 'object', properties: { authType: { const: 'basic' } } },
          oauth: {
            type: 'object',
            properties: { authType: { const: 'oauth_authorization_code' } },
          },
        },
        anyOf: [{ $ref: '#/$defs/basic' }, { $ref: '#/$defs/oauth' }],
      };

      const variant = getDiscriminatedUnionVariantJsonSchemaNode(
        jsonSchema,
        'authType',
        'oauth_authorization_code'
      ) as { properties: { authType: { const: string } } };

      expect(variant.properties.authType.const).toBe('oauth_authorization_code');
    });
  });
});

