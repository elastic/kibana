/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catalogConfigSchema, assertCatalogUrlAllowed } from './catalog_config';

describe('catalogConfigSchema', () => {
  it('applies documented defaults', () => {
    const config = catalogConfigSchema.validate({});

    expect(config.enabled).toBe(false);
    expect(config.url).toBe('https://workflows.elastic.co/connectors/v1');
    expect(config.localBundlePath).toBeUndefined();
    expect(config.refreshInterval.asMilliseconds()).toBe(5 * 60 * 1000);
  });

  it('rejects a refresh interval below 10 seconds', () => {
    expect(() => catalogConfigSchema.validate({ refreshInterval: '9s' })).toThrow(
      /refreshInterval/
    );
  });

  it('accepts a 10 second refresh interval', () => {
    const config = catalogConfigSchema.validate({ refreshInterval: '10s' });
    expect(config.refreshInterval.asMilliseconds()).toBe(10_000);
  });

  it('rejects a non-http(s) url', () => {
    expect(() => catalogConfigSchema.validate({ url: 'ftp://example.com/catalog' })).toThrow();
  });
});

describe('assertCatalogUrlAllowed', () => {
  it('allows http in development', () => {
    expect(() => assertCatalogUrlAllowed('http://127.0.0.1:8089', true)).not.toThrow();
  });

  it('allows https outside development', () => {
    expect(() =>
      assertCatalogUrlAllowed('https://workflows.elastic.co/connectors/v1', false)
    ).not.toThrow();
  });

  it('rejects http outside development', () => {
    expect(() => assertCatalogUrlAllowed('http://127.0.0.1:8089', false)).toThrow(
      'xpack.actions.catalog.url must use https outside of development mode'
    );
  });
});
