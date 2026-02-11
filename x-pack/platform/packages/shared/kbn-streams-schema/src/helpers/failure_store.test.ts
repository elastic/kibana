/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '../models/streams';
import type { FailureStore } from '../models/ingest/failure_store';
import { findInheritedFailureStore } from './failure_store';

function createMockWiredStream(
  name: string,
  failureStore: FailureStore
): Streams.WiredStream.Definition {
  return {
    name,
    description: name,
    updated_at: new Date().toISOString(),
    ingest: {
      wired: { fields: {}, routing: [] },
      processing: { steps: [], updated_at: new Date().toISOString() },
      lifecycle: { inherit: {} },
      settings: {},
      failure_store: failureStore,
    },
  };
}

describe('findInheritedFailureStore', () => {
  it('should find failure store from the stream definition itself when not inheriting', () => {
    const definition = createMockWiredStream('logs.app', {
      lifecycle: {
        enabled: {
          data_retention: '7d',
        },
      },
    });

    const result = findInheritedFailureStore(definition, []);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '7d',
          is_default_retention: false,
        },
      },
      from: 'logs.app',
    });
  });

  it('should find failure store from nearest ancestor', () => {
    const root = createMockWiredStream('logs', {
      lifecycle: {
        enabled: {
          data_retention: '30d',
        },
      },
    });

    const child = createMockWiredStream('logs.app', { inherit: {} });

    const result = findInheritedFailureStore(child, [root]);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '30d',
          is_default_retention: false,
        },
      },
      from: 'logs',
    });
  });

  it('should find failure store from the closest non-inheriting ancestor', () => {
    const root = createMockWiredStream('logs', {
      lifecycle: {
        enabled: {
          data_retention: '90d',
        },
      },
    });

    const middle = createMockWiredStream('logs.app', {
      lifecycle: {
        enabled: {
          data_retention: '14d',
        },
      },
    });

    const leaf = createMockWiredStream('logs.app.service', { inherit: {} });

    const result = findInheritedFailureStore(leaf, [root, middle]);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '14d',
          is_default_retention: false,
        },
      },
      from: 'logs.app',
    });
  });

  it('should handle failure store with disabled lifecycle', () => {
    const definition = createMockWiredStream('logs.app', {
      lifecycle: { disabled: {} },
    });

    const result = findInheritedFailureStore(definition, []);

    expect(result).toEqual({
      lifecycle: { disabled: {} },
      from: 'logs.app',
    });
  });

  it('should handle disabled failure store', () => {
    const definition = createMockWiredStream('logs.app', { disabled: {} });

    const result = findInheritedFailureStore(definition, []);

    expect(result).toEqual({
      disabled: {},
      from: 'logs.app',
    });
  });

  it('should preserve data_retention when present', () => {
    const definition = createMockWiredStream('logs.app', {
      lifecycle: {
        enabled: {
          data_retention: '365d',
        },
      },
    });

    const result = findInheritedFailureStore(definition, []);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '365d',
          is_default_retention: false,
        },
      },
      from: 'logs.app',
    });
  });

  it('should handle failure store without data_retention', () => {
    const definition = createMockWiredStream('logs.app', {
      lifecycle: {
        enabled: {},
      },
    });

    const result = findInheritedFailureStore(definition, []);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          is_default_retention: true,
        },
      },
      from: 'logs.app',
    });
  });

  it('should throw error when no failure store configuration is found', () => {
    const child = createMockWiredStream('logs.app', { inherit: {} });

    expect(() => findInheritedFailureStore(child, [])).toThrow(
      'Unable to find inherited failure store configuration'
    );
  });

  it('should handle multiple inheriting ancestors correctly', () => {
    const root = createMockWiredStream('logs', {
      lifecycle: {
        enabled: {
          data_retention: '180d',
        },
      },
    });

    const middle1 = createMockWiredStream('logs.app', { inherit: {} });

    const middle2 = createMockWiredStream('logs.app.service', { inherit: {} });

    const leaf = createMockWiredStream('logs.app.service.instance', { inherit: {} });

    const result = findInheritedFailureStore(leaf, [root, middle1, middle2]);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '180d',
          is_default_retention: false,
        },
      },
      from: 'logs',
    });
  });

  it('should find from middle ancestor when skipping inheriting ones', () => {
    const root = createMockWiredStream('logs', {
      lifecycle: {
        enabled: {
          data_retention: '180d',
        },
      },
    });

    const middle = createMockWiredStream('logs.app', { inherit: {} });

    const overriding = createMockWiredStream('logs.app.service', {
      lifecycle: {
        enabled: {
          data_retention: '1d',
        },
      },
    });

    const leaf = createMockWiredStream('logs.app.service.instance', { inherit: {} });

    const result = findInheritedFailureStore(leaf, [root, middle, overriding]);

    expect(result).toEqual({
      lifecycle: {
        enabled: {
          data_retention: '1d',
          is_default_retention: false,
        },
      },
      from: 'logs.app.service',
    });
  });
});
