/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  type EisInferenceEndpoint,
  type GroupedModel,
  type TaskTypeCategory,
} from '../../utils/eis_utils';

const makeEndpoint = (
  overrides: Partial<EisInferenceEndpoint> &
    Pick<EisInferenceEndpoint, 'inference_id' | 'task_type'>
): EisInferenceEndpoint =>
  ({
    service: 'elastic',
    service_settings: { model_id: '' },
    ...overrides,
  } as EisInferenceEndpoint);

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
        scenario: 'returns display name from metadata',
        endpoint: {
          ...makeEndpoint({
            inference_id: '.openai-gpt-4.1-chat_completion',
            task_type: 'chat_completion' as const,
            service_settings: { model_id: 'openai-gpt-4.1' },
          }),
          metadata: { display: { name: 'OpenAI GPT-4.1' } },
        } as EisInferenceEndpoint,
        expected: 'OpenAI GPT-4.1',
      },
      {
        scenario: 'returns model_id when no display metadata',
        endpoint: makeEndpoint({
          inference_id: 'eis-elser-endpoint',
          task_type: 'sparse_embedding',
          service_settings: { model_id: '.elser-2-linux-x86_64' },
        }),
        expected: '.elser-2-linux-x86_64',
      },
      {
        scenario: 'returns inference_id when model_id is empty',
        endpoint: makeEndpoint({
          inference_id: 'eis-chat-completion',
          task_type: 'completion',
          service_settings: { model_id: '' },
        }),
        expected: 'eis-chat-completion',
      },
    ])('$scenario', ({ endpoint, expected }) => {
      expect(getModelName(endpoint)).toBe(expected);
    });
  });

  describe('getProviderName', () => {
    it.each([
      { key: 'elastic', returnsRaw: false },
      { key: 'elasticsearch', returnsRaw: false },
      { key: 'openai', returnsRaw: false },
      { key: 'custom-eis-provider', returnsRaw: true },
      { key: 'my-service', returnsRaw: true },
    ])('$key → returnsRaw=$returnsRaw', ({ key, returnsRaw }) => {
      const name = getProviderName(key);
      if (returnsRaw) {
        expect(name).toBe(key);
      } else {
        expect(name).not.toBe(key);
      }
    });
  });

  describe('groupEndpointsByModel', () => {
    it('returns empty array for empty input', () => {
      expect(groupEndpointsByModel([])).toEqual([]);
    });

    it('groups by service + model name, aggregating task types and categories', () => {
      const endpoints = [
        makeEndpoint({
          inference_id: 'eis-e5-embed',
          task_type: 'text_embedding',
          service_settings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inference_id: 'eis-e5-chat',
          task_type: 'chat_completion',
          service_settings: { model_id: '.multilingual-e5-small' },
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

    it('separates groups by model name', () => {
      const endpoints = [
        makeEndpoint({
          inference_id: 'eis-e5',
          task_type: 'text_embedding',
          service_settings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inference_id: 'eis-elser',
          task_type: 'sparse_embedding',
          service_settings: { model_id: '.elser-2-linux-x86_64' },
        }),
        makeEndpoint({
          inference_id: 'eis-rerank',
          task_type: 'rerank',
          service_settings: { model_id: 'rerank-v1' },
        }),
      ];

      const result = groupEndpointsByModel(endpoints);
      expect(result).toHaveLength(3);
    });

    it('deduplicates task types and categories within a group', () => {
      const endpoints = [
        makeEndpoint({
          inference_id: 'eis-e5-text',
          task_type: 'text_embedding',
          service_settings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inference_id: 'eis-e5-text-dup',
          task_type: 'text_embedding',
          service_settings: { model_id: '.multilingual-e5-small' },
        }),
        makeEndpoint({
          inference_id: 'eis-e5-sparse',
          task_type: 'sparse_embedding',
          service_settings: { model_id: '.multilingual-e5-small' },
        }),
      ];

      const result = groupEndpointsByModel(endpoints);
      expect(result).toHaveLength(1);
      expect(result[0].taskTypes).toEqual(['text_embedding', 'sparse_embedding']);
      expect(result[0].categories).toEqual(['Embedding']);
      expect(result[0].endpoints).toHaveLength(3);
    });

    it('assigns empty categories for unknown task types', () => {
      const endpoints = [
        makeEndpoint({
          inference_id: 'eis-custom',
          task_type: 'unknown_type' as EisInferenceEndpoint['task_type'],
          service_settings: { model_id: '.elser-2-linux-x86_64' },
        }),
      ];

      expect(groupEndpointsByModel(endpoints)[0].categories).toEqual([]);
    });
  });

  describe('getProviderOptions', () => {
    it('returns empty array for empty input', () => {
      expect(getProviderOptions([])).toEqual([]);
    });

    it('deduplicates providers across models', () => {
      const models: GroupedModel[] = [
        makeGroupedModel({ modelName: '.multilingual-e5-small' }),
        makeGroupedModel({ modelName: '.elser-2-linux-x86_64' }),
        makeGroupedModel({ modelName: 'rerank-v1' }),
      ];

      const options = getProviderOptions(models);
      expect(options).toHaveLength(1);
      expect(options[0].key).toBe('elastic');
      expect(options[0].label).toBeTruthy();
    });
  });

  describe('filterGroupedModels', () => {
    const models: GroupedModel[] = [
      makeGroupedModel({
        modelName: '.multilingual-e5-small',
        taskTypes: ['text_embedding'],
        categories: ['Embedding'],
      }),
      makeGroupedModel({
        modelName: 'rainbow-sprinkle-completion',
        taskTypes: ['chat_completion'],
        categories: ['LLM'],
      }),
      makeGroupedModel({
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
        {
          query: 'Elastic Inference',
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion', 'rerank-v1'],
        },
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
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion', 'rerank-v1'],
        },
        { providers: ['openai'], expectedModels: [] },
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
