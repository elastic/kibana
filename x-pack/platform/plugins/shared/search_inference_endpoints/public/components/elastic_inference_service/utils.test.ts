/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getModelName,
  getModelCreator,
  getProviderKeyForCreator,
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
  modelCreator: 'Elastic',
  taskTypes: ['text_embedding'],
  categories: ['Embedding'],
  endpoints: [],
  ...overrides,
});

describe('utils', () => {
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

  describe('getModelCreator', () => {
    it('returns model_creator from metadata when present', () => {
      const endpoint = {
        ...makeEndpoint({
          inference_id: 'eis-gpt',
          task_type: 'chat_completion' as const,
          service_settings: { model_id: 'gpt-4.1' },
        }),
        metadata: { display: { model_creator: 'OpenAI' } },
      } as EisInferenceEndpoint;
      expect(getModelCreator(endpoint)).toBe('OpenAI');
    });

    it('falls back to provider name when no metadata', () => {
      const endpoint = makeEndpoint({
        inference_id: 'eis-e5',
        task_type: 'text_embedding',
        service_settings: { model_id: '.multilingual-e5-small' },
      });
      expect(getModelCreator(endpoint)).toBe('Elastic Inference Service');
    });
  });

  describe('getProviderKeyForCreator', () => {
    it.each([
      ['Anthropic', 'anthropic'],
      ['Elastic', 'elastic'],
      ['Google', 'googleaistudio'],
      ['OpenAI', 'openai'],
      ['Jina', 'jinaai'],
      ['Microsoft', 'azureopenai'],
    ])('%s → %s', (creator, expectedKey) => {
      expect(getProviderKeyForCreator(creator)).toBe(expectedKey);
    });

    it('returns undefined for unknown creators', () => {
      expect(getProviderKeyForCreator('UnknownCorp')).toBeUndefined();
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
        modelCreator: expect.any(String),
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

    it('merges user-created endpoint (no metadata) with pre-configured endpoint (with metadata) sharing the same model_id', () => {
      // Pre-configured endpoint has display metadata; user-created one does not.
      // Both reference the same underlying model via model_id.
      const preconfigured = {
        ...makeEndpoint({
          inference_id: '.eis-elastic-elser-sparse_embedding',
          task_type: 'sparse_embedding' as const,
          service_settings: { model_id: 'elastic-elser-v2' },
        }),
        metadata: { display: { name: 'Elastic ELSER v2', model_creator: 'Elastic' } },
      } as EisInferenceEndpoint;

      const userCreated = makeEndpoint({
        inference_id: 'my-eis-elser-endpoint',
        task_type: 'sparse_embedding' as const,
        service_settings: { model_id: 'elastic-elser-v2' },
      });

      const result = groupEndpointsByModel([preconfigured, userCreated]);

      // Both endpoints must be in the same group — no duplicate card.
      expect(result).toHaveLength(1);
      expect(result[0].endpoints).toHaveLength(2);
      expect(result[0].modelName).toBe('Elastic ELSER v2');
      expect(result[0].modelCreator).toBe('Elastic');
    });

    it('prefers metadata display name/creator when user-created endpoint is processed first', () => {
      const userCreated = makeEndpoint({
        inference_id: 'my-eis-elser-endpoint',
        task_type: 'sparse_embedding' as const,
        service_settings: { model_id: 'elastic-elser-v2' },
      });

      const preconfigured = {
        ...makeEndpoint({
          inference_id: '.eis-elastic-elser-sparse_embedding',
          task_type: 'text_embedding' as const,
          service_settings: { model_id: 'elastic-elser-v2' },
        }),
        metadata: { display: { name: 'Elastic ELSER v2', model_creator: 'Elastic' } },
      } as EisInferenceEndpoint;

      const result = groupEndpointsByModel([userCreated, preconfigured]);

      expect(result).toHaveLength(1);
      expect(result[0].endpoints).toHaveLength(2);
      expect(result[0].modelName).toBe('Elastic ELSER v2');
      expect(result[0].modelCreator).toBe('Elastic');
    });
  });

  describe('getProviderOptions', () => {
    it('returns empty array for empty input', () => {
      expect(getProviderOptions([])).toEqual([]);
    });

    it('deduplicates creators and sorts alphabetically', () => {
      const models: GroupedModel[] = [
        makeGroupedModel({ modelName: '.multilingual-e5-small', modelCreator: 'Elastic' }),
        makeGroupedModel({ modelName: 'gpt-4.1', modelCreator: 'OpenAI' }),
        makeGroupedModel({ modelName: 'rerank-v1', modelCreator: 'Elastic' }),
      ];

      const options = getProviderOptions(models);
      expect(options).toHaveLength(2);
      expect(options[0]).toEqual({ key: 'Elastic', label: 'Elastic' });
      expect(options[1]).toEqual({ key: 'OpenAI', label: 'OpenAI' });
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
          query: 'Elastic',
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
          providers: ['Elastic'],
          expectedModels: ['.multilingual-e5-small', 'rainbow-sprinkle-completion', 'rerank-v1'],
        },
        { providers: ['OpenAI'], expectedModels: [] },
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
        selectedProviders: ['Elastic'],
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
