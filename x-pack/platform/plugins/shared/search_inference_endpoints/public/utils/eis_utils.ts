/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { isInferenceEndpointWithDisplayNameMetadata } from '../../common/type_guards';
import type { MultiSelectFilterOption } from '../components/filter/multi_select_filter';

export type EisInferenceEndpoint = InferenceAPIConfigResponse & {
  service: 'elastic';
  service_settings: { model_id: string };
};

export const isEisEndpoint = (ep: InferenceAPIConfigResponse): ep is EisInferenceEndpoint =>
  ep.service === 'elastic';

const serviceProviderKeys = new Set<string>(Object.values(ServiceProviderKeys));

export const isServiceProviderKey = (value: string): value is ServiceProviderKeys =>
  serviceProviderKeys.has(value);

export type TaskTypeCategory = 'LLM' | 'Embedding' | 'Rerank';

export const TASK_TYPE_CATEGORY: Partial<Record<InferenceTaskType, TaskTypeCategory>> = {
  chat_completion: 'LLM',
  completion: 'LLM',
  text_embedding: 'Embedding',
  sparse_embedding: 'Embedding',
  rerank: 'Rerank',
};

export const TASK_TYPE_DISPLAY_NAME: Record<InferenceTaskType, string> = {
  chat_completion: i18n.translate(
    'xpack.searchInferenceEndpoints.eisUtils.taskType.chatCompletion',
    { defaultMessage: 'chat completion' }
  ),
  completion: i18n.translate('xpack.searchInferenceEndpoints.eisUtils.taskType.completion', {
    defaultMessage: 'completion',
  }),
  text_embedding: i18n.translate('xpack.searchInferenceEndpoints.eisUtils.taskType.textEmbedding', {
    defaultMessage: 'text embedding',
  }),
  sparse_embedding: i18n.translate(
    'xpack.searchInferenceEndpoints.eisUtils.taskType.sparseEmbedding',
    { defaultMessage: 'sparse embedding' }
  ),
  rerank: i18n.translate('xpack.searchInferenceEndpoints.eisUtils.taskType.rerank', {
    defaultMessage: 'rerank',
  }),
};

export interface GroupedModel {
  service: 'elastic';
  modelName: string;
  taskTypes: InferenceTaskType[];
  categories: TaskTypeCategory[];
  endpoints: EisInferenceEndpoint[];
}

export const getModelName = (endpoint: EisInferenceEndpoint): string => {
  if (isInferenceEndpointWithDisplayNameMetadata(endpoint)) {
    return endpoint.metadata.display.name;
  }
  const { model_id: modelId } = endpoint.service_settings;
  return modelId.length > 0 ? modelId : endpoint.inference_id;
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
      if (!existing.taskTypes.includes(ep.task_type)) {
        existing.taskTypes.push(ep.task_type);
        const cat = TASK_TYPE_CATEGORY[ep.task_type];
        if (cat && !existing.categories.includes(cat)) {
          existing.categories.push(cat);
        }
      }
      existing.endpoints.push(ep);
    } else {
      const cat = TASK_TYPE_CATEGORY[ep.task_type];
      groups.set(key, {
        service: ep.service,
        modelName,
        taskTypes: [ep.task_type],
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
