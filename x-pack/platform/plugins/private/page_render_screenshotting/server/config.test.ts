/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('config schema', () => {
  it('is disabled by default', () => {
    expect(config.schema.validate({})).toEqual({
      enabled: false,
      ssl: { verificationMode: 'full' },
    });
  });

  it('accepts an https kibanaBaseUrl', () => {
    expect(config.schema.validate({ kibanaBaseUrl: 'https://kibana.example.com' })).toMatchObject({
      kibanaBaseUrl: 'https://kibana.example.com',
    });
  });

  it('rejects a non-https kibanaBaseUrl', () => {
    expect(() => config.schema.validate({ kibanaBaseUrl: 'http://kibana.example.com' })).toThrow(
      /kibanaBaseUrl/
    );
  });

  it('allows kibanaBaseUrl to be overridden at runtime', () => {
    expect(config.dynamicConfig).toEqual({ kibanaBaseUrl: true });
  });
});
