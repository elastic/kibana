/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  createDiscoverFeaturesStepDefinition,
  type DiscoverFeaturesDeps,
} from './discover_features';

jest.mock('@kbn/ai-tools', () => ({
  getSampleDocuments: jest.fn(),
}));

jest.mock('@kbn/streams-ai', () => ({
  identifyFeatures: jest.fn(),
}));

jest.mock('@kbn/streams-ai/src/features/prompt', () => ({
  featuresPrompt: 'mock-system-prompt',
}));

import { getSampleDocuments } from '@kbn/ai-tools';
import { identifyFeatures } from '@kbn/streams-ai';

const getSampleDocumentsMock = getSampleDocuments as jest.MockedFunction<typeof getSampleDocuments>;
const identifyFeaturesMock = identifyFeatures as jest.MockedFunction<typeof identifyFeatures>;

const fakeRequest = { headers: {} } as unknown as KibanaRequest;

const createContext = (overrides: Partial<any> = {}): StepHandlerContext => ({
  input: {
    rules: [],
    max_data_views: 5,
  },
  config: {},
  rawInput: {},
  contextManager: {
    getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
    getContext: jest.fn(),
    getScopedEsClient: jest.fn().mockReturnValue({
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    }),
    renderInputTemplate: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  abortSignal: new AbortController().signal,
  stepId: 'test-step',
  stepType: 'alerting.discoverFeatures',
  ...overrides,
});

const createDeps = (overrides: Partial<DiscoverFeaturesDeps> = {}): DiscoverFeaturesDeps => ({
  getScopedSoClient: jest.fn().mockReturnValue({
    find: jest.fn().mockResolvedValue({ saved_objects: [] }),
  }),
  getInferenceClient: jest.fn().mockReturnValue(undefined),
  getDefaultConnectorId: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('alerting.discoverFeatures step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty features when no data views exist', async () => {
    const deps = createDeps();
    const step = createDiscoverFeaturesStepDefinition(deps);
    const context = createContext();

    const result = await step.handler(context);

    expect(result.output).toEqual({
      features: [],
      data_views_processed: [],
    });
  });

  describe('KI fetch path', () => {
    it('fetches KIs when data view resolves to a stream', async () => {
      const mockKIs = [
        {
          _source: {
            feature: {
              id: 'nginx-service',
              type: 'service',
              subtype: 'web_server',
              title: 'Nginx',
              description: 'Nginx web server',
              properties: { name: 'nginx' },
              tags: ['web'],
            },
            stream: { name: 'logs.nginx' },
          },
        },
      ];

      const esClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce({
            hits: { hits: [{ _source: { name: 'logs.nginx' } }] },
          })
          .mockResolvedValueOnce({
            hits: { hits: mockKIs },
          }),
      };

      const soClient = {
        find: jest.fn().mockResolvedValue({
          saved_objects: [
            { attributes: { title: 'logs-nginx-*', name: 'Nginx Logs' } },
          ],
        }),
      };

      const deps = createDeps({
        getScopedSoClient: jest.fn().mockReturnValue(soClient),
      });

      const context = createContext({
        contextManager: {
          getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
          getContext: jest.fn(),
          getScopedEsClient: jest.fn().mockReturnValue(esClient),
          renderInputTemplate: jest.fn(),
        },
      });

      const step = createDiscoverFeaturesStepDefinition(deps);
      const result = await step.handler(context);

      expect(result.output.features).toHaveLength(1);
      expect(result.output.features[0].id).toBe('nginx-service');
      expect(result.output.features[0].stream_name).toBe('logs.nginx');
      expect(result.output.data_views_processed).toHaveLength(1);
      expect(result.output.data_views_processed[0].source).toBe('existing_kis');
      expect(result.output.data_views_processed[0].stream_name).toBe('logs.nginx');
    });
  });

  describe('inline extraction fallback', () => {
    it('runs inline extraction when no stream matches and inference is available', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
      };

      const soClient = {
        find: jest.fn().mockResolvedValue({
          saved_objects: [
            { attributes: { title: 'metrics-*', name: 'All Metrics' } },
          ],
        }),
      };

      const mockInferenceClient = {
        bindTo: jest.fn().mockReturnValue({ prompt: jest.fn() }),
      };

      getSampleDocumentsMock.mockResolvedValue({
        hits: [
          { _id: 'doc-1', _index: 'metrics-system', _source: { host: { name: 'web-01' } } },
        ] as any,
        total: 1,
      });

      identifyFeaturesMock.mockResolvedValue({
        features: [
          {
            id: 'host-web-01',
            type: 'infrastructure',
            subtype: 'host',
            title: 'web-01',
            description: 'Host web-01',
            properties: { name: 'web-01' },
            tags: ['host'],
            stream_name: 'metrics',
          },
        ] as any,
        ignoredFeatures: [],
        tokensUsed: { prompt: 100, completion: 50, total: 150, cached: 0 },
      });

      const deps = createDeps({
        getScopedSoClient: jest.fn().mockReturnValue(soClient),
        getInferenceClient: jest.fn().mockReturnValue(mockInferenceClient),
        getDefaultConnectorId: jest.fn().mockResolvedValue('connector-1'),
      });

      const context = createContext({
        contextManager: {
          getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
          getContext: jest.fn(),
          getScopedEsClient: jest.fn().mockReturnValue(esClient),
          renderInputTemplate: jest.fn(),
        },
      });

      const step = createDiscoverFeaturesStepDefinition(deps);
      const result = await step.handler(context);

      expect(result.output.features).toHaveLength(1);
      expect(result.output.features[0].id).toBe('host-web-01');
      expect(result.output.data_views_processed).toHaveLength(1);
      expect(result.output.data_views_processed[0].source).toBe('inline_extraction');
      expect(getSampleDocumentsMock).toHaveBeenCalled();
      expect(identifyFeaturesMock).toHaveBeenCalled();
    });
  });

  describe('skipped path', () => {
    it('marks data view as skipped when no inference client is available', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
      };

      const soClient = {
        find: jest.fn().mockResolvedValue({
          saved_objects: [
            { attributes: { title: 'logs-*', name: 'All Logs' } },
          ],
        }),
      };

      const deps = createDeps({
        getScopedSoClient: jest.fn().mockReturnValue(soClient),
        getInferenceClient: jest.fn().mockReturnValue(undefined),
        getDefaultConnectorId: jest.fn().mockResolvedValue(undefined),
      });

      const context = createContext({
        contextManager: {
          getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
          getContext: jest.fn(),
          getScopedEsClient: jest.fn().mockReturnValue(esClient),
          renderInputTemplate: jest.fn(),
        },
      });

      const step = createDiscoverFeaturesStepDefinition(deps);
      const result = await step.handler(context);

      expect(result.output.features).toHaveLength(0);
      expect(result.output.data_views_processed).toHaveLength(1);
      expect(result.output.data_views_processed[0].source).toBe('skipped');
      expect(result.output.data_views_processed[0].feature_count).toBe(0);
    });
  });

  describe('prioritization', () => {
    it('prioritizes data views that overlap with rule FROM clauses', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
      };

      const soClient = {
        find: jest.fn().mockResolvedValue({
          saved_objects: [
            { attributes: { title: 'unrelated-*', name: 'Unrelated' } },
            { attributes: { title: 'logs-nginx-*', name: 'Nginx Logs' } },
            { attributes: { title: 'random-data', name: 'Random' } },
          ],
        }),
      };

      const rules = [
        {
          id: 'rule-1',
          rule: { evaluation: { query: { base: 'FROM logs-nginx-* | STATS count()' } } },
        },
      ];

      const deps = createDeps({
        getScopedSoClient: jest.fn().mockReturnValue(soClient),
      });

      const context = createContext({
        input: { rules, max_data_views: 2 },
        contextManager: {
          getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
          getContext: jest.fn(),
          getScopedEsClient: jest.fn().mockReturnValue(esClient),
          renderInputTemplate: jest.fn(),
        },
      });

      const step = createDiscoverFeaturesStepDefinition(deps);
      const result = await step.handler(context);

      expect(result.output.data_views_processed).toHaveLength(2);
      expect(result.output.data_views_processed[0].pattern).toBe('logs-nginx-*');
    });
  });

  describe('deduplication', () => {
    it('deduplicates features across data views', async () => {
      const sharedFeature = {
        _source: {
          feature: {
            id: 'shared-service',
            type: 'service',
            description: 'Shared service',
            properties: { name: 'shared' },
            tags: [],
          },
          stream: { name: 'logs.app' },
        },
      };

      const esClient = {
        search: jest
          .fn()
          .mockResolvedValueOnce({
            hits: { hits: [{ _source: { name: 'logs.app' } }, { _source: { name: 'logs.web' } }] },
          })
          .mockResolvedValueOnce({ hits: { hits: [sharedFeature] } })
          .mockResolvedValueOnce({ hits: { hits: [sharedFeature] } }),
      };

      const soClient = {
        find: jest.fn().mockResolvedValue({
          saved_objects: [
            { attributes: { title: 'logs-app-*', name: 'App Logs' } },
            { attributes: { title: 'logs-web-*', name: 'Web Logs' } },
          ],
        }),
      };

      const deps = createDeps({
        getScopedSoClient: jest.fn().mockReturnValue(soClient),
      });

      const context = createContext({
        contextManager: {
          getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
          getContext: jest.fn(),
          getScopedEsClient: jest.fn().mockReturnValue(esClient),
          renderInputTemplate: jest.fn(),
        },
      });

      const step = createDiscoverFeaturesStepDefinition(deps);
      const result = await step.handler(context);

      expect(result.output.features).toHaveLength(1);
      expect(result.output.features[0].id).toBe('shared-service');
    });
  });
});
