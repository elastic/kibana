/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfiguredFetchFactory, ConfiguredFetchResource } from '@kbn/connector-specs';
import { buildCustomFetch } from './build_custom_fetch';

describe('buildCustomFetch', () => {
  const targetUrl = 'https://mcp-server.example.com/v1/mcp';

  it('delegates to the configured-fetch factory', () => {
    const mockResource: ConfiguredFetchResource = {
      fetch: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const factory: ConfiguredFetchFactory = jest.fn().mockReturnValue(mockResource);

    const result = buildCustomFetch(factory, targetUrl);

    expect(factory).toHaveBeenCalledWith({ targetUrl });
    expect(result).toBe(mockResource);
  });

  it('passes the targetUrl to the factory', () => {
    const anotherUrl = 'https://other.example.com/api';
    const mockResource: ConfiguredFetchResource = {
      fetch: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const factory: ConfiguredFetchFactory = jest.fn().mockReturnValue(mockResource);

    buildCustomFetch(factory, anotherUrl);

    expect(factory).toHaveBeenCalledWith({ targetUrl: anotherUrl });
  });
});
