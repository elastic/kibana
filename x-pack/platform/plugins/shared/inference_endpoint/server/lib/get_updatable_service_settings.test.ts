/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType, type ConfigProperties } from '@kbn/inference-common';
import { getUpdatableServiceSettings } from './get_updatable_service_settings';

const createField = (overrides: Partial<ConfigProperties>): ConfigProperties => ({
  default_value: null,
  description: null,
  label: 'Field',
  required: false,
  sensitive: false,
  updatable: true,
  type: FieldType.STRING,
  supported_task_types: ['text_embedding'],
  ...overrides,
});

const configurations = {
  model_id: createField({ updatable: false }),
  url: createField({}),
  client_id: createField({}),
  token_url: createField({}),
  scopes: createField({ type: FieldType.LIST }),
  'rate_limit.requests_per_minute': createField({ type: FieldType.INTEGER }),
  num_allocations: createField({ type: FieldType.INTEGER }),
  api_key: createField({ sensitive: true }),
  client_secret: createField({ sensitive: true }),
};

describe('getUpdatableServiceSettings', () => {
  it('returns updatable settings and secrets that have a value', () => {
    expect(
      getUpdatableServiceSettings(
        configurations,
        {
          model_id: 'text-embedding-3-small',
          url: 'https://example.com/v1/embeddings',
          client_id: 'kibana',
          token_url: 'https://example.com/token',
          scopes: ['api'],
        },
        { api_key: null, client_secret: 'secret' }
      )
    ).toEqual({
      url: 'https://example.com/v1/embeddings',
      client_id: 'kibana',
      token_url: 'https://example.com/token',
      scopes: ['api'],
      client_secret: 'secret',
    });
  });

  it('omits non-updatable fields, fields the service does not define, and allocation settings', () => {
    expect(
      getUpdatableServiceSettings(configurations, {
        model_id: 'text-embedding-3-small',
        unknown_field: 'value',
        num_allocations: 2,
        adaptive_allocations: { enabled: true },
      })
    ).toEqual({});
  });

  it('omits null, undefined, and empty string values', () => {
    expect(
      getUpdatableServiceSettings(
        configurations,
        { url: '', client_id: undefined, token_url: null },
        { api_key: '', client_secret: null }
      )
    ).toEqual({});
  });

  it('nests dotted keys', () => {
    expect(
      getUpdatableServiceSettings(configurations, { 'rate_limit.requests_per_minute': 0 })
    ).toEqual({ rate_limit: { requests_per_minute: 0 } });
  });
});
