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
import {
  isInferenceEndpointWithDisplayNameMetadata,
  isInferenceEndpointWithDisplayCreatorMetadata,
} from '../../common/type_guards';
import type { MultiSelectFilterOption } from '../components/filter/multi_select_filter';

export type EisInferenceEndpoint = InferenceAPIConfigResponse & {
  service: 'elastic';
  service_settings: { model_id: string };
};

export const isEisEndpoint = (ep: InferenceAPIConfigResponse): ep is EisInferenceEndpoint =>
  ep.service === 'elastic';

// Inference ID prefixes for internal Elastic endpoints kept for backwards
// compatibility that must not be surfaced in the UI.
const HIDDEN_EIS_INFERENCE_ID_PREFIXES = ['.gp-llm-v2', '.rainbow-sprinkles'];

export const isHiddenEisEndpoint = (ep: InferenceAPIConfigResponse): boolean =>
  HIDDEN_EIS_INFERENCE_ID_PREFIXES.some((prefix) => ep.inference_id.startsWith(prefix));

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
  modelCreator: string;
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

export const getModelCreator = (endpoint: EisInferenceEndpoint): string => {
  if (isInferenceEndpointWithDisplayCreatorMetadata(endpoint)) {
    return endpoint.metadata.display.model_creator;
  }
  return SERVICE_PROVIDERS[endpoint.service]?.name ?? endpoint.service;
};

const CREATOR_TO_PROVIDER_KEY: Record<string, ServiceProviderKeys> = {
  Anthropic: ServiceProviderKeys.anthropic,
  Elastic: ServiceProviderKeys.elastic,
  Google: ServiceProviderKeys.googleaistudio,
  Jina: ServiceProviderKeys.jinaai,
  Microsoft: ServiceProviderKeys.azureopenai,
  OpenAI: ServiceProviderKeys.openai,
};

export const getProviderKeyForCreator = (creator: string): ServiceProviderKeys | undefined =>
  CREATOR_TO_PROVIDER_KEY[creator];

export const groupEndpointsByModel = (endpoints: EisInferenceEndpoint[]): GroupedModel[] => {
  const groups = new Map<string, GroupedModel>();

  for (const ep of endpoints) {
    const { model_id: modelId } = ep.service_settings;
    // Group by model_id so that user-created endpoints with the same underlying model
    // are merged with pre-configured endpoints, even when metadata display names differ.
    const key = `${ep.service}::${modelId.length > 0 ? modelId : ep.inference_id}`;

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
      // Prefer metadata-based display values when available, so that a pre-configured
      // endpoint's friendly name/creator wins over the raw model_id fallback.
      if (isInferenceEndpointWithDisplayNameMetadata(ep)) {
        existing.modelName = ep.metadata.display.name;
      }
      if (isInferenceEndpointWithDisplayCreatorMetadata(ep)) {
        existing.modelCreator = ep.metadata.display.model_creator;
      }
    } else {
      const cat = TASK_TYPE_CATEGORY[ep.task_type];
      groups.set(key, {
        service: ep.service,
        modelName: getModelName(ep),
        modelCreator: getModelCreator(ep),
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
  const unique = [...new Set(models.map((m) => m.modelCreator))].sort();
  return unique.map((creator) => ({
    key: creator,
    label: creator,
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
        !m.modelCreator.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (selectedTaskTypes.size > 0 && !m.categories.some((cat) => selectedTaskTypes.has(cat))) {
        return false;
      }
      if (selectedProviders.length > 0 && !selectedProviders.includes(m.modelCreator)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.modelName.localeCompare(b.modelName));
};
