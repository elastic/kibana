/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpoint } from '../../hooks/use_eis_models';
import {
  isServiceProviderKey,
  getModelName,
  getProviderName,
  groupEndpointsByModel,
  getProviderOptions,
  filterGroupedModels,
  TASK_TYPE_CATEGORY,
  TASK_TYPE_DISPLAY_NAME,
  TASK_TYPE_FILTERS,
  type GroupedModel,
  type TaskTypeCategory,
} from './utils';

const makeEndpoint = (
  overrides: Partial<EisInferenceEndpoint> & Pick<EisInferenceEndpoint, 'inferenceId' | 'taskType'>
): EisInferenceEndpoint => ({
  service: 'elastic',
  serviceSettings: {},
  ...overrides,
});

const makeGroupedModel = (overrides: Partial<GroupedModel> = {}): GroupedModel => ({
  service: 'elastic',
  modelName: '.multilingual-e5-small',
  taskTypes: ['text_embedding'],
  categories: ['Embedding'],
  endpoints: [],
  ...overrides,
});

describe('utils', () => {
  describe('isServiceProviderKey', () => {
    it.each([
      ['elastic', true],
      ['elasticsearch', true],
      ['openai', true],
      ['cohere', true],
      ['anthropic', true],
      ['mistral', true],
      ['hugging_face', true],
      ['amazonbedrock', true],
      ['googleaistudio', true],
      ['not-a-provider', false],
      ['', false],
      ['random-service', false],
    ])('%s → %s', (key, expected) => {
      expect(isServiceProviderKey(key)).toBe(expected);
    });
  });

  describe('TASK_TYPE_CATEGORY', () => {
    it.each([
      ['chat_completion', 'LLM'],
      ['completion', 'LLM'],
      ['text_embedding', 'Embedding'],
      ['sparse_embedding', 'Embedding'],
      ['rerank', 'Rerank'],
    ] as const)('%s → %s', (taskType, expectedCategory) => {
      expect(TASK_TYPE_CATEGORY[taskType]).toBe(expectedCategory);
    });
  });

  describe('TASK_TYPE_DISPLAY_NAME', () => {
    it.each([
      ['chat_completion', 'chat completion'],
      ['completion', 'completion'],
      ['text_embedding', 'text embedding'],
      ['sparse_embedding', 'sparse embedding'],
      ['rerank', 'rerank'],
    ] as const)('%s → %s', (taskType, expectedName) => {
      expect(TASK_TYPE_DISPLAY_NAME[taskType]).toBe(expectedName);
    });
  });

  describe('TASK_TYPE_FILTERS', () => {
    it('covers all expected categories in order', () => {
      expect(TASK_TYPE_FILTERS.map((f) => f.category)).toEqual(['LLM', 'Embedding', 'Rerank']);
    });
  });

  describe('getModelName', () => {
    it.each([
      {
        scenario: 'model_id present',
        endpoint: makeEndpoint({
          inferenceId: 'eis-elser-endpoint',
          taskType: 'sparse_embedding',
          serviceSettings: { model_id: '.elser-2-linux-x86_64' },
        }),
        expected: '.elser-2-linux-x86_64',
      },
      {
        scenario: 'model_id missing',
        endpoint: makeEndpoint({
          inferenceId: 'eis-elser-sparse-embedding',
          taskType: 'sparse_embedding',
          serviceSettings: {},
        }),
        expected: 'eis-elser-sparse-embedding',
      },
      {
        scenario: 'model_id empty string',
        endpoint: makeEndpoint({
          inferenceId: 'eis-e5-text-embedding',
          taskType: 'text_embedding',
          serviceSettings: { model_id: '' },
        }),
        expected: 'eis-e5-text-embedding',
      },
      {
        scenario: 'model_id non-string',
        endpoint: makeEndpoint({
          inferenceId: 'eis-rerank-endpoint',
          taskType: 'rerank',
          serviceSettings: { model_id: 42 },
        }),
        expected: 'eis-rerank-endpoint',
      },
      {
        scenario: 'serviceSettings undefined',
        endpoint: {
          inferenceId: 'eis-chat-completion',
          taskType: 'completion' as const,
          service: 'elastic',
        },
        expected: 'eis-chat-completion',
      },
    ])('returns $expected when $scenario', ({ endpoint, expected }) => {
      expect(getModelName(endpoint)).toBe(expected);
    });
  });

  describe('getProviderName', () => {
    it.each([
      ['elastic', true],
      ['elasticsearch', true],
      ['openai', true],
    ])('returns a human-readable name for known key "%s"', (key) => {
      const name = getProviderName(key);
      expect(typeof name).toBe('string');
      expect(name).not.toBe(key);
    });

    it.each(['custom-eis-provider', 'my-service'])(
      'returns raw string for unknown key "%s"',
      (key) => {
        expect(getProviderName(key)).toBe(key);
      }
    );
  });

  describe('groupEndpointsByModel', () => {
    it('returns empty array for empty input', () => {
      expect(groupEndpointsByModel([])).toEqual([]);
    });

    it('groups by service + model_id, aggregating task types and categories', () => {
      const endpoints: EisInferenceEndpoint[] = [
        makeEndpoint({
          inferenceId: 'eis-e5-embed',
          taskType: 'text_embedding',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inferenceId: 'eis-e5-chat',
          taskType: 'chat_completion',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
      ];

      const result = groupEndpointsByModel(endpoints);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        modelName: '.multilingual-e5-small',
        taskTypes: ['text_embedding', 'chat_completion'],
        categories: ['Embedding', 'LLM'],
      });
      expect(result[0].endpoints).toHaveLength(2);
    });

    it('separates groups by model name and by service', () => {
      const endpoints: EisInferenceEndpoint[] = [
        makeEndpoint({
          inferenceId: 'eis-e5',
          taskType: 'text_embedding',
          service: 'elastic',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inferenceId: 'eis-elser',
          taskType: 'sparse_embedding',
          service: 'elastic',
          serviceSettings: { model_id: '.elser-2-linux-x86_64' },
        }),
        makeEndpoint({
          inferenceId: 'es-e5',
          taskType: 'text_embedding',
          service: 'elasticsearch',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
      ];

      const result = groupEndpointsByModel(endpoints);
      expect(result).toHaveLength(3);
    });

    it('deduplicates task types and categories within a group', () => {
      const endpoints: EisInferenceEndpoint[] = [
        makeEndpoint({
          inferenceId: 'eis-e5-text',
          taskType: 'text_embedding',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inferenceId: 'eis-e5-text-dup',
          taskType: 'text_embedding',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inferenceId: 'eis-e5-sparse',
          taskType: 'sparse_embedding',
          serviceSettings: { model_id: '.multilingual-e5-small' },
        }),
      ];

      const result = groupEndpointsByModel(endpoints);
      expect(result).toHaveLength(1);
      expect(result[0].taskTypes).toEqual(['text_embedding', 'sparse_embedding']);
      expect(result[0].categories).toEqual(['Embedding']);
      expect(result[0].endpoints).toHaveLength(3);
    });

    it('assigns empty categories for unknown task types', () => {
      const endpoints: EisInferenceEndpoint[] = [
        makeEndpoint({
          inferenceId: 'eis-custom',
          taskType: 'unknown_type' as EisInferenceEndpoint['taskType'],
          serviceSettings: { model_id: '.elser-2-linux-x86_64' },
        }),
      ];

      expect(groupEndpointsByModel(endpoints)[0].categories).toEqual([]);
    });
  });

  describe('getProviderOptions', () => {
    it('returns unique provider options preserving insertion order, empty for empty input', () => {
      expect(getProviderOptions([])).toEqual([]);

      const models: GroupedModel[] = [
        makeGroupedModel({ service: 'elastic', modelName: '.multilingual-e5-small' }),
        makeGroupedModel({ service: 'elastic', modelName: '.elser-2-linux-x86_64' }),
        makeGroupedModel({ service: 'elasticsearch', modelName: 'rerank-v1' }),
      ];

      const options = getProviderOptions(models);
      expect(options).toHaveLength(2);
      expect(options.map((o) => o.key)).toEqual(['elastic', 'elasticsearch']);
      options.forEach((o) => {
        expect(o.label).toBeTruthy();
      });
    });
  });

  describe('filterGroupedModels', () => {
    const models: GroupedModel[] = [
      makeGroupedModel({
        service: 'elastic',
        modelName: '.multilingual-e5-small',
        taskTypes: ['text_embedding'],
        categories: ['Embedding'],
      }),
      makeGroupedModel({
        service: 'elastic',
        modelName: 'rainbow-sprinkle-completion',
        taskTypes: ['chat_completion'],
        categories: ['LLM'],
      }),
      makeGroupedModel({
        service: 'elasticsearch',
        modelName: 'rerank-v1',
        taskTypes: ['rerank'],
        categories: ['Rerank'],
      }),
    ];

    const noFilters = {
      searchQuery: '',
      selectedTaskTypes: new Set<TaskTypeCategory>(),
      selectedProviders: [] as string[],
    };

    it('returns all models sorted alphabetically when no filters applied', () => {
      const result = filterGroupedModels(models, noFilters);
      expect(result.map((m) => m.modelName)).toEqual([
        '.multilingual-e5-small',
        'rainbow-sprinkle-completion',
        'rerank-v1',
      ]);
    });

    describe('search query', () => {
      it.each([
        { query: 'e5-small', expectedModels: ['.multilingual-e5-small'] },
        { query: 'rainbow', expectedModels: ['rainbow-sprinkle-completion'] },
        { query: 'Elasticsearch', expectedModels: ['rerank-v1'] },
        { query: 'E5-SMALL', expectedModels: ['.multilingual-e5-small'] },
        { query: 'nonexistent', expectedModels: [] },
      ])('query "$query" → $expectedModels', ({ query, expectedModels }) => {
        const result = filterGroupedModels(models, { ...noFilters, searchQuery: query });
        expect(result.map((m) => m.modelName)).toEqual(expectedModels);
      });
    });

    describe('task type category filter', () => {
      it.each([
        {
          categories: ['Embedding'] as TaskTypeCategory[],
          expectedModels: ['.multilingual-e5-small'],
        },
        {
          categories: ['LLM'] as TaskTypeCategory[],
          expectedModels: ['rainbow-sprinkle-completion'],
        },
        { categories: ['Rerank'] as TaskTypeCategory[], expectedModels: ['rerank-v1'] },
        {
          categories: ['Embedding', 'Rerank'] as TaskTypeCategory[],
          expectedModels: ['.multilingual-e5-small', 'rerank-v1'],
        },
        {
          categories: ['LLM', 'Embedding', 'Rerank'] as TaskTypeCategory[],
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion', 'rerank-v1'],
        },
      ])('$categories → $expectedModels', ({ categories, expectedModels }) => {
        const result = filterGroupedModels(models, {
          ...noFilters,
          selectedTaskTypes: new Set(categories),
        });
        expect(result.map((m) => m.modelName)).toEqual(expectedModels);
      });
    });

    describe('provider filter', () => {
      it.each([
        {
          providers: ['elastic'],
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion'],
        },
        { providers: ['elasticsearch'], expectedModels: ['rerank-v1'] },
        {
          providers: ['elastic', 'elasticsearch'],
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion', 'rerank-v1'],
        },
      ])('$providers → $expectedModels', ({ providers, expectedModels }) => {
        const result = filterGroupedModels(models, {
          ...noFilters,
          selectedProviders: providers,
        });
        expect(result.map((m) => m.modelName)).toEqual(expectedModels);
      });
    });

    it('applies all filters together', () => {
      const result = filterGroupedModels(models, {
        searchQuery: 'rainbow',
        selectedTaskTypes: new Set<TaskTypeCategory>(['LLM']),
        selectedProviders: ['elastic'],
      });
      expect(result.map((m) => m.modelName)).toEqual(['rainbow-sprinkle-completion']);
    });

    it('sorts results alphabetically', () => {
      const unsorted: GroupedModel[] = [
        makeGroupedModel({ modelName: 'rerank-v1' }),
        makeGroupedModel({ modelName: '.elser-2-linux-x86_64' }),
        makeGroupedModel({ modelName: '.multilingual-e5-small' }),
      ];

      const result = filterGroupedModels(unsorted, noFilters);
      expect(result.map((m) => m.modelName)).toEqual([
        '.elser-2-linux-x86_64',
        '.multilingual-e5-small',
        'rerank-v1',
      ]);
    });
  });
});
