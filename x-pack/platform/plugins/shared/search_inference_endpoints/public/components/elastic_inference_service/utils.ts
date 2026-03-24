/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { MultiSelectFilterOption } from '../filter/multi_select_filter';
import type { EisInferenceEndpoint } from '../../hooks/use_eis_models';

const serviceProviderKeys = new Set<string>(Object.values(ServiceProviderKeys));

export const isServiceProviderKey = (value: string): value is ServiceProviderKeys =>
  serviceProviderKeys.has(value);

export type TaskTypeCategory = 'LLM' | 'Embedding' | 'Rerank';

export const TASK_TYPE_CATEGORY: Record<string, TaskTypeCategory> = {
  chat_completion: 'LLM',
  completion: 'LLM',
  text_embedding: 'Embedding',
  sparse_embedding: 'Embedding',
  rerank: 'Rerank',
};

export const TASK_TYPE_DISPLAY_NAME: Record<string, string> = {
  chat_completion: 'chat completion',
  completion: 'completion',
  text_embedding: 'text embedding',
  sparse_embedding: 'sparse embedding',
  rerank: 'rerank',
};

export interface GroupedModel {
  service: string;
  modelName: string;
  taskTypes: string[];
  categories: TaskTypeCategory[];
  endpoints: EisInferenceEndpoint[];
}

export const getModelName = (endpoint: EisInferenceEndpoint): string => {
  const modelId = endpoint.serviceSettings?.model_id;
  return typeof modelId === 'string' && modelId.length > 0 ? modelId : endpoint.inferenceId;
};

export const getProviderName = (service: string): string => {
  if (!isServiceProviderKey(service)) return service;
  return SERVICE_PROVIDERS[service].name;
};

export const groupEndpointsByModel = (endpoints: EisInferenceEndpoint[]): GroupedModel[] => {
  const groups = new Map<string, GroupedModel>();

  for (const ep of endpoints) {
    const modelName = getModelName(ep);
    const key = `${ep.service}::${modelName}`;

    const existing = groups.get(key);
    if (existing) {
      if (!existing.taskTypes.includes(ep.taskType)) {
        existing.taskTypes.push(ep.taskType);
        const cat = TASK_TYPE_CATEGORY[ep.taskType];
        if (cat && !existing.categories.includes(cat)) {
          existing.categories.push(cat);
        }
      }
      existing.endpoints.push(ep);
    } else {
      const cat = TASK_TYPE_CATEGORY[ep.taskType];
      groups.set(key, {
        service: ep.service,
        modelName,
        taskTypes: [ep.taskType],
        categories: cat ? [cat] : [],
        endpoints: [ep],
      });
    }
  }

  return [...groups.values()];
};

export const TASK_TYPE_FILTERS: Array<{ category: TaskTypeCategory; label: string }> = [
  {
    category: 'LLM',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.filter.llm', {
      defaultMessage: 'LLM',
    }),
  },
  {
    category: 'Embedding',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.filter.embedding', {
      defaultMessage: 'Embedding',
    }),
  },
  {
    category: 'Rerank',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.filter.rerank', {
      defaultMessage: 'Rerank',
    }),
  },
];

export const getProviderOptions = (models: GroupedModel[]): MultiSelectFilterOption[] => {
  const unique = [...new Set(models.map((m) => m.service))];
  return unique.map((service) => ({
    key: service,
    label: getProviderName(service),
  }));
};

export interface FilterCriteria {
  searchQuery: string;
  selectedTaskTypes: Set<TaskTypeCategory>;
  selectedProviders: string[];
}

export const filterGroupedModels = (
  models: GroupedModel[],
  { searchQuery, selectedTaskTypes, selectedProviders }: FilterCriteria
): GroupedModel[] => {
  const q = searchQuery.toLowerCase();

  return models
    .filter((m) => {
      if (
        q &&
        !m.modelName.toLowerCase().includes(q) &&
        !getProviderName(m.service).toLowerCase().includes(q)
      ) {
        return false;
      }
      if (selectedTaskTypes.size > 0 && !m.categories.some((cat) => selectedTaskTypes.has(cat))) {
        return false;
      }
      if (selectedProviders.length > 0 && !selectedProviders.includes(m.service)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.modelName.localeCompare(b.modelName));
};
