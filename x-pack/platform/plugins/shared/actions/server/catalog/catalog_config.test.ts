/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catalogConfigSchema, DEFAULT_CATALOG_URL } from './catalog_config';

describe('catalogConfigSchema', () => {
  it('applies documented defaults', () => {
    const config = catalogConfigSchema.validate({});

    expect(config.enabled).toBe(false);
    expect(config.url).toBe(DEFAULT_CATALOG_URL);
    expect(config.refreshInterval.asMilliseconds()).toBe(5 * 60 * 1000);
  });

  it('rejects an http url outside development', () => {
    expect(() =>
      catalogConfigSchema.validate({ url: 'http://127.0.0.1:8089' }, { dev: false })
    ).toThrow(/https/);
  });

  it('accepts an http url in development', () => {
    const config = catalogConfigSchema.validate({ url: 'http://127.0.0.1:8089' }, { dev: true });

    expect(config.url).toBe('http://127.0.0.1:8089');
  });

  it('rejects a refresh interval below 10 seconds', () => {
    expect(() => catalogConfigSchema.validate({ refreshInterval: '5s' })).toThrow(
      /refreshInterval/
    );
  });

  it('accepts a 10 second refresh interval', () => {
    const config = catalogConfigSchema.validate({ refreshInterval: '10s' });
    expect(config.refreshInterval.asMilliseconds()).toBe(10_000);
  });
});
