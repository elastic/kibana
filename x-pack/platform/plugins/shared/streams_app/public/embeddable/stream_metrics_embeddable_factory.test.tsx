/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAM_METRICS_EMBEDDABLE_ID } from '../../common/embeddable';
import { getStreamMetricsEmbeddableFactory } from './stream_metrics_embeddable_factory';

describe('getStreamMetricsEmbeddableFactory', () => {
  const mockCoreStart = {
    http: {},
    theme: {
      getTheme: () => ({ darkMode: false }),
    },
  } as any;

  const mockPluginsStart = {
    data: {
      query: {
        timefilter: {
          timefilter: {
            getTime: () => ({ from: 'now-1d', to: 'now' }),
            getAbsoluteTime: () => ({
              from: new Date('2024-01-01'),
              to: new Date('2024-01-02'),
            }),
          },
        },
      },
      search: {
        search: jest.fn(),
      },
    },
    streams: {
      streamsRepositoryClient: {
        fetch: jest.fn(),
      },
    },
  } as any;

  it('should return a factory with the correct type', () => {
    const factory = getStreamMetricsEmbeddableFactory({
      coreStart: mockCoreStart,
      pluginsStart: mockPluginsStart,
    });

    expect(factory.type).toBe(STREAM_METRICS_EMBEDDABLE_ID);
  });

  it('should have a buildEmbeddable function', () => {
    const factory = getStreamMetricsEmbeddableFactory({
      coreStart: mockCoreStart,
      pluginsStart: mockPluginsStart,
    });

    expect(typeof factory.buildEmbeddable).toBe('function');
  });

  describe('buildEmbeddable', () => {
    it('should return an api with serializeState function', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { streamName: 'test-stream' },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      expect(embeddable.api).toBeDefined();
      expect(typeof embeddable.api.serializeState).toBe('function');
    });

    it('should serialize state correctly with initial streamName', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { streamName: 'logs-test' },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      const serializedState = embeddable.api.serializeState();
      expect(serializedState.streamName).toBe('logs-test');
    });

    it('should serialize state correctly with undefined streamName', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { streamName: undefined },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      const serializedState = embeddable.api.serializeState();
      expect(serializedState.streamName).toBeUndefined();
    });

    it('should serialize title state', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { title: 'Custom Title', streamName: 'test-stream' },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      const serializedState = embeddable.api.serializeState();
      expect(serializedState.title).toBe('Custom Title');
    });

    it('should have setStreamName function on api', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { streamName: 'initial-stream' },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      expect(typeof embeddable.api.setStreamName).toBe('function');

      // Update stream name
      embeddable.api.setStreamName('new-stream');

      const serializedState = embeddable.api.serializeState();
      expect(serializedState.streamName).toBe('new-stream');
    });

    it('should return a Component', async () => {
      const factory = getStreamMetricsEmbeddableFactory({
        coreStart: mockCoreStart,
        pluginsStart: mockPluginsStart,
      });

      const mockFinalizeApi = jest.fn((api) => api);
      const mockParentApi = {} as any;

      const embeddable = await factory.buildEmbeddable({
        initialState: { streamName: undefined },
        finalizeApi: mockFinalizeApi,
        uuid: 'test-uuid',
        parentApi: mockParentApi,
      });

      expect(embeddable.Component).toBeDefined();
    });
  });
});
