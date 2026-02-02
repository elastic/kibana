/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRootStreamDefinition } from './is_root';

describe('isRootStreamDefinition', () => {
  it('returns true for a valid root wired stream definition', () => {
    const validWired = {
      name: 'logs',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        wired: { fields: {}, routing: [] },
        failure_store: { inherit: {} },
      },
    };
    expect(isRootStreamDefinition(validWired)).toBe(true);
  });

  it('returns false for a wired stream definition with a non-root name', () => {
    const nonRootWired = {
      name: 'logs.bar',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        wired: { fields: {}, routing: [] },
        failure_store: { inherit: {} },
      },
    };
    expect(isRootStreamDefinition(nonRootWired)).toBe(false);
  });

  it('returns false for a classic stream definition even with a root name', () => {
    const classic = {
      name: 'logs-test-default',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        lifecycle: { inherit: {} },
        processing: { steps: [], updated_at: new Date().toISOString() },
        settings: {},
        classic: {},
        failure_store: { inherit: {} },
      },
    };
    expect(isRootStreamDefinition(classic)).toBe(false);
  });
});
