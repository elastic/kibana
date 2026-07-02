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
import {
  type EisInferenceEndpoint,
  EisModelStatus,
  type AvailabilityRegions,
  type CspRegion,
} from '../../common/types';
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

/** Map from CSP identifier to human-readable cloud provider name. */
export const CSP_DISPLAY_NAMES: Record<string, string> = {
  aws: 'Amazon Web Services (AWS)',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud Platform (GCP)',
};

/**
 * Maps a `csp::region` key to a human-readable region display name.
 * Falls back to the raw region code when no entry is found.
 */
export const REGION_DISPLAY_NAMES: Record<string, string> = {
  // Asia Pacific
  'aws::ap-east-1': 'AP East (Hong Kong)',
  'aws::ap-northeast-1': 'AP Northeast (Tokyo)',
  'aws::ap-northeast-2': 'AP Northeast (Seoul)',
  'aws::ap-northeast-3': 'AP Northeast (Osaka)',
  'aws::ap-south-1': 'AP South (Mumbai)',
  'aws::ap-south-2': 'AP South (Hyderabad)',
  'aws::ap-southeast-1': 'AP Southeast (Singapore)',
  'aws::ap-southeast-2': 'AP Southeast (Sydney)',
  'aws::ap-southeast-3': 'AP Southeast (Jakarta)',
  'aws::ap-southeast-4': 'AP Southeast (Melbourne)',
  // Europe
  'aws::eu-central-1': 'EU Central (Frankfurt)',
  'aws::eu-central-2': 'EU Central (Zurich)',
  'aws::eu-north-1': 'EU North (Stockholm)',
  'aws::eu-south-1': 'EU South (Milan)',
  'aws::eu-south-2': 'EU South (Spain)',
  'aws::eu-west-1': 'EU West (Ireland)',
  'aws::eu-west-2': 'EU West (London)',
  'aws::eu-west-3': 'EU West (Paris)',
  // Middle East & Africa
  'aws::af-south-1': 'Africa South (Cape Town)',
  'aws::il-central-1': 'Israel Central (Tel Aviv)',
  'aws::me-central-1': 'ME Central (UAE)',
  'aws::me-south-1': 'ME South (Bahrain)',
  // North America
  'aws::ca-central-1': 'Canada Central (Montréal)',
  'aws::ca-west-1': 'Canada West (Calgary)',
  'aws::us-east-1': 'US East (N. Virginia)',
  'aws::us-east-2': 'US East (Ohio)',
  'aws::us-west-1': 'US West (N. California)',
  'aws::us-west-2': 'US West (Oregon)',
  // South America
  'aws::sa-east-1': 'SA East (São Paulo)',
};

/**
 * Maps a `csp::region` key to a geographic zone ID used in the region picker.
 * Regions not listed here are placed under the catch-all 'other' zone.
 */
export const REGION_ZONE: Record<string, string> = {
  // Asia Pacific
  'aws::ap-east-1': 'asiaPacific',
  'aws::ap-northeast-1': 'asiaPacific',
  'aws::ap-northeast-2': 'asiaPacific',
  'aws::ap-northeast-3': 'asiaPacific',
  'aws::ap-south-1': 'asiaPacific',
  'aws::ap-south-2': 'asiaPacific',
  'aws::ap-southeast-1': 'asiaPacific',
  'aws::ap-southeast-2': 'asiaPacific',
  'aws::ap-southeast-3': 'asiaPacific',
  'aws::ap-southeast-4': 'asiaPacific',
  // Europe
  'aws::eu-central-1': 'europe',
  'aws::eu-central-2': 'europe',
  'aws::eu-north-1': 'europe',
  'aws::eu-south-1': 'europe',
  'aws::eu-south-2': 'europe',
  'aws::eu-west-1': 'europe',
  'aws::eu-west-2': 'europe',
  'aws::eu-west-3': 'europe',
  // Middle East & Africa
  'aws::af-south-1': 'middleEast',
  'aws::il-central-1': 'middleEast',
  'aws::me-central-1': 'middleEast',
  'aws::me-south-1': 'middleEast',
  // North America
  'aws::ca-central-1': 'northAmerica',
  'aws::ca-west-1': 'northAmerica',
  'aws::us-east-1': 'northAmerica',
  'aws::us-east-2': 'northAmerica',
  'aws::us-west-1': 'northAmerica',
  'aws::us-west-2': 'northAmerica',
  // South America
  'aws::sa-east-1': 'southAmerica',
};

/** Maps a zone ID to its display name shown in the region picker. */
export const ZONE_DISPLAY_NAMES: Record<string, string> = {
  asiaPacific: 'Asia Pacific',
  europe: 'Europe',
  middleEast: 'Middle East & Africa',
  northAmerica: 'North America',
  southAmerica: 'South America',
  other: 'Other',
};

/** Ordered list of zone IDs for display in the region picker. */
export const ZONE_ORDER = [
  'asiaPacific',
  'europe',
  'middleEast',
  'northAmerica',
  'southAmerica',
  'other',
] as const;

const isAvailabilityRegions = (value: unknown): value is AvailabilityRegions => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.regions) && Array.isArray(v.geos);
};

const isCspRegion = (value: unknown): value is CspRegion => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.csp === 'string' && typeof v.region === 'string';
};

/**
 * Aggregates all unique CSP regions from EIS endpoint `availability_regions` metadata.
 * The returned list is deduplicated (by csp+region key) and sorted alphabetically.
 */
export const getAvailableRegions = (endpoints: EisInferenceEndpoint[]): CspRegion[] => {
  const seen = new Set<string>();
  const result: CspRegion[] = [];

  for (const ep of endpoints) {
    if (!ep.metadata) continue;
    const raw = (ep.metadata as Record<string, unknown>).availability_regions;
    if (!isAvailabilityRegions(raw)) continue;

    for (const r of raw.regions) {
      if (!isCspRegion(r)) continue;
      const key = `${r.csp}::${r.region}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(r);
      }
    }
  }

  return result.sort((a, b) => {
    const cspCmp = a.csp.localeCompare(b.csp);
    return cspCmp !== 0 ? cspCmp : a.region.localeCompare(b.region);
  });
};
