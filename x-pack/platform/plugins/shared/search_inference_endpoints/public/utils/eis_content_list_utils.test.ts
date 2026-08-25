/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindItemsParams } from '@kbn/content-list-provider';
import {
  createEisFieldDefinitions,
  createEisFindItems,
  EIS_CATEGORY_FILTER_ID,
  EIS_NAME_SORT_FIELD,
  EIS_PROVIDER_FILTER_ID,
  getItemModelId,
  toGroupedModel,
} from './eis_content_list_utils';
import type { GroupedModel } from './eis_utils';
import { EisModelStatus } from '../../common/types';

const model = (
  modelName: string,
  modelCreator: string,
  overrides: Partial<GroupedModel> = {}
): GroupedModel => ({
  service: 'elastic',
  modelName,
  modelCreator,
  modelStatus: EisModelStatus.GA,
  taskTypes: ['chat_completion'],
  categories: ['LLM'],
  endpoints: [
    {
      inference_id: `${modelName}-endpoint`,
      task_type: 'chat_completion',
      service: 'elastic',
      service_settings: { model_id: `${modelName}-id` },
    },
  ],
  ...overrides,
});

const models = [
  model('Claude Sonnet', 'Anthropic'),
  model('Jina Reranker v2', 'Jina AI', {
    taskTypes: ['rerank'],
    categories: ['Rerank'],
  }),
  model('Alpha Embedder', 'Elastic', {
    taskTypes: ['text_embedding'],
    categories: ['Embedding'],
  }),
];

const findParams = (overrides: Partial<FindItemsParams> = {}): FindItemsParams => ({
  searchQuery: '',
  filters: {},
  sort: { field: EIS_NAME_SORT_FIELD, direction: 'asc' },
  page: { index: 0, size: 20 },
  ...overrides,
});

describe('createEisFindItems', () => {
  const findItems = createEisFindItems(models);

  it('returns every model sorted by name when no query is active', async () => {
    const { items, total } = await findItems(findParams());

    expect(total).toBe(3);
    expect(items.map(({ title }) => title)).toEqual([
      'Alpha Embedder',
      'Claude Sonnet',
      'Jina Reranker v2',
    ]);
  });

  it('reverses the order for a descending name sort', async () => {
    const { items } = await findItems(
      findParams({ sort: { field: EIS_NAME_SORT_FIELD, direction: 'desc' } })
    );

    expect(items.map(({ title }) => title)).toEqual([
      'Jina Reranker v2',
      'Claude Sonnet',
      'Alpha Embedder',
    ]);
  });

  it('sorts by provider', async () => {
    const { items } = await findItems(
      findParams({ sort: { field: EIS_PROVIDER_FILTER_ID, direction: 'asc' } })
    );

    expect(items.map((item) => toGroupedModel(item).modelCreator)).toEqual([
      'Anthropic',
      'Elastic',
      'Jina AI',
    ]);
  });

  it('matches the search query against model name and creator', async () => {
    const byName = await findItems(findParams({ searchQuery: 'jina reranker' }));
    expect(byName.items.map(({ title }) => title)).toEqual(['Jina Reranker v2']);

    const byCreator = await findItems(findParams({ searchQuery: 'anthropic' }));
    expect(byCreator.items.map(({ title }) => title)).toEqual(['Claude Sonnet']);
  });

  it('filters by the provider dimension', async () => {
    const { items } = await findItems(
      findParams({ filters: { [EIS_PROVIDER_FILTER_ID]: { include: ['Elastic'] } } })
    );

    expect(items.map(({ title }) => title)).toEqual(['Alpha Embedder']);
  });

  it('excludes models by the provider dimension', async () => {
    const { items } = await findItems(
      findParams({ filters: { [EIS_PROVIDER_FILTER_ID]: { exclude: ['Anthropic'] } } })
    );

    expect(items.map(({ title }) => title)).toEqual(['Alpha Embedder', 'Jina Reranker v2']);
  });

  it('filters by the task-type category dimension', async () => {
    const { items } = await findItems(
      findParams({ filters: { [EIS_CATEGORY_FILTER_ID]: { include: ['Rerank', 'Embedding'] } } })
    );

    expect(items.map(({ title }) => title)).toEqual(['Alpha Embedder', 'Jina Reranker v2']);
  });

  it('excludes models by the task-type category dimension', async () => {
    const { items } = await findItems(
      findParams({ filters: { [EIS_CATEGORY_FILTER_ID]: { exclude: ['LLM'] } } })
    );

    expect(items.map(({ title }) => title)).toEqual(['Alpha Embedder', 'Jina Reranker v2']);
  });

  it('carries the model id when the first endpoint has one, and omits it otherwise', async () => {
    const withoutModelId = model('No Model Id', 'Elastic', {
      endpoints: [
        {
          inference_id: 'no-model-id-endpoint',
          task_type: 'chat_completion',
          service: 'elastic',
          service_settings: { model_id: '' },
        },
      ],
    });
    const { items } = await createEisFindItems([models[0], withoutModelId])(findParams());

    const [claude, noId] = items;
    expect(getItemModelId(claude)).toBe('Claude Sonnet-id');
    expect(getItemModelId(noId)).toBeUndefined();
    expect(noId.id).toBe('elastic::No Model Id');
  });
});

describe('createEisFieldDefinitions', () => {
  const fields = createEisFieldDefinitions(models);
  const provider = fields.find(({ fieldName }) => fieldName === EIS_PROVIDER_FILTER_ID);
  const category = fields.find(({ fieldName }) => fieldName === EIS_CATEGORY_FILTER_ID);

  if (!provider || !category) {
    throw new Error('Expected provider and category field definitions');
  }

  it('resolves providers case-insensitively and by partial match', () => {
    expect(provider.fieldName).toBe(EIS_PROVIDER_FILTER_ID);
    expect(provider.resolveDisplayToId('anthropic')).toBe('Anthropic');
    expect(provider.resolveDisplayToId('Unknown')).toBeUndefined();
    expect(provider.resolveFuzzyDisplayToIds?.('ji')).toEqual(['Jina AI']);
  });

  it('resolves task-type categories by display label', () => {
    expect(category.fieldName).toBe(EIS_CATEGORY_FILTER_ID);
    expect(category.resolveIdToDisplay('Rerank')).toBe('Rerank');
    expect(category.resolveDisplayToId('embedding')).toBe('Embedding');
    expect(category.resolveFuzzyDisplayToIds?.('rer')).toEqual(['Rerank']);
  });
});
