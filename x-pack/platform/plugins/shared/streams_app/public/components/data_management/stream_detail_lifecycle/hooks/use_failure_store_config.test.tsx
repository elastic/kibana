/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { useFailureStoreConfig, transformFailureStoreConfig } from './use_failure_store_config';
import { useFailureStoreDefaultRetention } from './use_failure_store_default_retention';

jest.mock('./use_failure_store_default_retention');

const mockUseFailureStoreDefaultRetention = useFailureStoreDefaultRetention as jest.MockedFunction<
  typeof useFailureStoreDefaultRetention
>;

const createBaseDefinition = (name: string): Partial<Streams.ingest.all.GetResponse> => ({
  stream: {
    name,
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      failure_store: { inherit: {} },
    } as any,
  },
});

const createClassicDefinition = (
  name: string,
  failureStoreConfig: any
): Streams.ClassicStream.GetResponse => ({
  ...createBaseDefinition(name),
  stream: {
    ...createBaseDefinition(name).stream!,
    ingest: {
      ...createBaseDefinition(name).stream!.ingest,
      classic: {},
    },
  },
  privileges: {
    lifecycle: true,
    manage: true,
    monitor: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
  },
  effective_lifecycle: { dsl: {} },
  effective_settings: {},
  effective_failure_store: failureStoreConfig,
  data_stream_exists: true,
  dashboards: [],
  queries: [],
  rules: [],
});

const createWiredDefinition = (
  name: string,
  failureStoreConfig: any,
  isRoot: boolean = false
): Streams.WiredStream.GetResponse => ({
  ...createBaseDefinition(name),
  stream: {
    ...createBaseDefinition(name).stream!,
    ingest: {
      ...createBaseDefinition(name).stream!.ingest,
      wired: {
        fields: {},
        routing: [],
      },
    },
  },
  privileges: {
    lifecycle: true,
    manage: true,
    monitor: true,
    simulate: true,
    text_structure: true,
    read_failure_store: true,
    manage_failure_store: true,
    view_index_metadata: true,
  },
  effective_lifecycle: {
    dsl: {},
    from: isRoot ? name : 'logs',
  },
  effective_failure_store: {
    ...failureStoreConfig,
    from: isRoot ? name : 'logs',
  },
  effective_settings: {},
  inherited_fields: {},
  dashboards: [],
  queries: [],
  rules: [],
});

describe('useFailureStoreConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFailureStoreDefaultRetention.mockReturnValue('30d');
  });

  describe('Classic Stream', () => {
    it('should return config for enabled failure store with custom retention', () => {
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          enabled: {
            data_retention: '7d',
          },
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: true,
        customRetentionPeriod: '7d',
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: false,
        inheritOptions: {
          canShowInherit: true,
          isWired: false,
          isCurrentlyInherited: true,
        },
      });
    });

    it('should return config for enabled failure store without custom retention', () => {
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          enabled: {},
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: false,
        inheritOptions: {
          canShowInherit: true,
          isWired: false,
          isCurrentlyInherited: true,
        },
      });
    });

    it('should return config for disabled failure store', () => {
      const definition = createClassicDefinition('logs-test', {
        disabled: {},
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: false,
        customRetentionPeriod: undefined,
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: false,
        inheritOptions: {
          canShowInherit: true,
          isWired: false,
          isCurrentlyInherited: true,
        },
      });
    });

    it('should return config for disabled lifecycle', () => {
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          disabled: {},
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: true,
        customRetentionPeriod: undefined,
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: true,
        inheritOptions: {
          canShowInherit: true,
          isWired: false,
          isCurrentlyInherited: true,
        },
      });
    });

    it('should detect when not inheriting (explicit failure store config)', () => {
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          enabled: {
            data_retention: '14d',
          },
        },
      });
      definition.stream.ingest.failure_store = {
        lifecycle: { enabled: { data_retention: '14d' } },
      };

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.inheritOptions.isCurrentlyInherited).toBe(false);
    });
  });

  describe('Wired Stream (child)', () => {
    it('should return config for enabled failure store with custom retention', () => {
      const definition = createWiredDefinition('logs.nginx', {
        lifecycle: {
          enabled: {
            data_retention: '5d',
          },
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: true,
        customRetentionPeriod: '5d',
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: false,
        inheritOptions: {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: true,
        },
      });
    });

    it('should return config when inheriting from parent', () => {
      const definition = createWiredDefinition('logs.nginx', {
        lifecycle: {
          enabled: {
            data_retention: '30d',
          },
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.inheritOptions.isCurrentlyInherited).toBe(true);
      expect(result.current.inheritOptions.canShowInherit).toBe(true);
    });

    it('should detect when overriding parent', () => {
      const definition = createWiredDefinition('logs.nginx', {
        lifecycle: {
          enabled: {
            data_retention: '10d',
          },
        },
      });
      definition.stream.ingest.failure_store = {
        lifecycle: { enabled: { data_retention: '10d' } },
      };

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.inheritOptions.isCurrentlyInherited).toBe(false);
      expect(result.current.customRetentionPeriod).toBe('10d');
    });
  });

  describe('Wired Stream (root)', () => {
    it('should return config for root stream (logs)', () => {
      const definition = createWiredDefinition(
        'logs',
        {
          lifecycle: {
            enabled: {
              data_retention: '30d',
            },
          },
        },
        true
      );
      definition.stream.ingest.failure_store = {
        lifecycle: { enabled: { data_retention: '30d' } },
      };

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current).toEqual({
        failureStoreEnabled: true,
        customRetentionPeriod: '30d',
        defaultRetentionPeriod: '30d',
        isDisabledLifecycle: false,
        inheritOptions: {
          canShowInherit: false,
          isWired: true,
          isCurrentlyInherited: false,
        },
      });
    });

    it('should return config for root stream (metrics)', () => {
      const definition = createWiredDefinition(
        'metrics',
        {
          lifecycle: {
            enabled: {
              data_retention: '60d',
            },
          },
        },
        true
      );
      definition.stream.ingest.failure_store = {
        lifecycle: { enabled: { data_retention: '60d' } },
      };

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.inheritOptions.canShowInherit).toBe(false);
      expect(result.current.customRetentionPeriod).toBe('60d');
    });
  });

  describe('Default retention period', () => {
    it('should use the default retention period from the hook', () => {
      mockUseFailureStoreDefaultRetention.mockReturnValue('90d');
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          enabled: {},
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.defaultRetentionPeriod).toBe('90d');
      expect(mockUseFailureStoreDefaultRetention).toHaveBeenCalledWith('logs-test');
    });

    it('should handle undefined default retention', () => {
      mockUseFailureStoreDefaultRetention.mockReturnValue(undefined);
      const definition = createClassicDefinition('logs-test', {
        lifecycle: {
          enabled: {},
        },
      });

      const { result } = renderHook(() => useFailureStoreConfig(definition));

      expect(result.current.defaultRetentionPeriod).toBeUndefined();
    });
  });
});

describe('transformFailureStoreConfig', () => {
  it('should transform to inherit config', () => {
    const result = transformFailureStoreConfig({
      inherit: true,
      failureStoreEnabled: true,
    });

    expect(result).toEqual({ inherit: {} });
  });

  it('should transform to disabled config when failureStore is disabled', () => {
    const result = transformFailureStoreConfig({
      failureStoreEnabled: false,
    });

    expect(result).toEqual({ disabled: {} });
  });

  it('should transform to disabled lifecycle config', () => {
    const result = transformFailureStoreConfig({
      failureStoreEnabled: true,
      lifecycleEnabled: false,
    });

    expect(result).toEqual({ lifecycle: { disabled: {} } });
  });

  it('should transform to enabled config without custom retention', () => {
    const result = transformFailureStoreConfig({
      failureStoreEnabled: true,
    });

    expect(result).toEqual({
      lifecycle: { enabled: { data_retention: undefined } },
    });
  });

  it('should transform to enabled config with custom retention', () => {
    const result = transformFailureStoreConfig({
      failureStoreEnabled: true,
      customRetentionPeriod: '15d',
    });

    expect(result).toEqual({
      lifecycle: { enabled: { data_retention: '15d' } },
    });
  });

  it('should prioritize inherit over other settings', () => {
    const result = transformFailureStoreConfig({
      inherit: true,
      failureStoreEnabled: true,
      customRetentionPeriod: '15d',
    });

    expect(result).toEqual({ inherit: {} });
  });

  it('should default failureStoreEnabled to false', () => {
    const result = transformFailureStoreConfig({});

    expect(result).toEqual({ disabled: {} });
  });
});
