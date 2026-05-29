/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { type EisInferenceEndpoint, EisModelStatus } from '../../common/types';
import {
  isInferenceEndpointWithMetadata,
  isInferenceEndpointWithDisplayNameMetadata,
  isInferenceEndpointWithDisplayCreatorMetadata,
} from '../../common/type_guards';
import type { MultiSelectFilterOption } from '../components/filter/multi_select_filter';

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
  embedding: i18n.translate('xpack.searchInferenceEndpoints.eisUtils.taskType.embedding', {
    defaultMessage: 'embedding',
  }),
};

export interface GroupedModel {
  service: 'elastic';
  modelName: string;
  modelCreator: string;
  modelStatus: EisModelStatus;
  taskTypes: InferenceTaskType[];
  categories: TaskTypeCategory[];
  endpoints: EisInferenceEndpoint[];
  modelMetadata?: EisInferenceEndpointMetadata;
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

export const getModelMetadata = (
  endpoint: EisInferenceEndpoint
): EisInferenceEndpointMetadata | undefined => {
  if (isInferenceEndpointWithMetadata(endpoint)) return endpoint.metadata;
  return undefined;
};

export const getModelStatus = (
  metadata: EisInferenceEndpointMetadata | undefined
): EisModelStatus => {
  if (!metadata) return EisModelStatus.Unknown;
  if (isModelEndOfLifeReached(metadata)) return EisModelStatus.DeprecatedEOL;
  // use helper function to catch eol dates within the next month regardless of status value
  if (isModelDeprecated(metadata)) return EisModelStatus.Deprecated;
  switch (metadata.heuristics?.status?.toLowerCase()) {
    case EisModelStatus.GA:
      return EisModelStatus.GA;
    case EisModelStatus.Preview:
      return EisModelStatus.Preview;
    default:
      return EisModelStatus.Unknown;
  }
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
      if (!existing.modelMetadata && isInferenceEndpointWithMetadata(ep)) {
        existing.modelMetadata = ep.metadata;
        existing.modelStatus = getModelStatus(ep.metadata);
      }
    } else {
      const cat = TASK_TYPE_CATEGORY[ep.task_type];
      const modelMetadata = getModelMetadata(ep);
      groups.set(key, {
        service: ep.service,
        modelName: getModelName(ep),
        modelCreator: getModelCreator(ep),
        modelStatus: getModelStatus(modelMetadata),
        taskTypes: [ep.task_type],
        categories: cat ? [cat] : [],
        endpoints: [ep],
        modelMetadata,
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

const MODEL_DEPRECATED_EOL_TIME_DURATION = 'now+30d';
export function isModelDeprecated(metadata: EisInferenceEndpointMetadata | undefined) {
  if (!metadata) return false;
  const eolDate = getModelEOLDate(metadata);
  if (eolDate && dateMath.parse(MODEL_DEPRECATED_EOL_TIME_DURATION)?.isSameOrAfter(eolDate)) {
    // if the EOL date is within the next 30 days, treat is as deprecated.
    return true;
  }
  if (metadata.heuristics?.status?.toLowerCase() === EisModelStatus.Deprecated) return true;
  return false;
}

export function isModelEndOfLifeReached(metadata: EisInferenceEndpointMetadata | undefined) {
  const eolDate = getModelEOLDate(metadata);
  if (!eolDate) return false;
  return dateMath.parse('now')?.isSameOrAfter(eolDate) ?? false;
}

export function getModelReleaseDate(metadata: EisInferenceEndpointMetadata | undefined) {
  if (!metadata) return undefined;
  if (!metadata.heuristics?.release_date) return undefined;
  const releaseMoment = dateMath.parse(metadata.heuristics.release_date);
  if (releaseMoment?.isValid()) {
    return releaseMoment;
  }
  return undefined;
}

export function getModelEOLDate(metadata: EisInferenceEndpointMetadata | undefined) {
  if (!metadata) return undefined;
  if (!metadata.heuristics?.end_of_life_date) return undefined;
  const eolMoment = dateMath.parse(metadata.heuristics.end_of_life_date);
  if (eolMoment?.isValid()) {
    return eolMoment;
  }
  return undefined;
}

export function getModelEOLMessage(eolFormattedDate: string | null) {
  return eolFormattedDate
    ? i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.content',
        {
          defaultMessage:
            "This model's end of life date is {eolFormattedDate}. It is no longer available.",
          values: { eolFormattedDate },
        }
      )
    : i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.contentNoDate',
        {
          defaultMessage: 'This model has reached end of life and is no longer available.',
        }
      );
}

export function getModelDeprecatedMessage(deprecatedFormattedDate: string | null) {
  return deprecatedFormattedDate
    ? i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.content',
        {
          defaultMessage:
            'This model will be deprecated on {deprecatedFormattedDate}. We recommend a newer model for optimal results.',
          values: { deprecatedFormattedDate },
        }
      )
    : i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.contentNoDate',
        {
          defaultMessage:
            'This model is deprecated. We recommend a newer model for optimal results.',
        }
      );
}
