/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActiveFilters,
  ContentListItem,
  FieldDefinition,
  FindItemsFn,
  FindItemsParams,
  IncludeExcludeFilter,
} from '@kbn/content-list-provider';
import {
  DEFAULT_EIS_DISPLAY_OPTIONS,
  filterGroupedModels,
  getModelEOLDate,
  getModelReleaseDate,
  getProviderOptions,
  MODEL_TYPE_FILTERS,
  type EisDisplayOptions,
  type GroupedModel,
  type TaskTypeCategory,
} from './eis_utils';
import { getModelId } from './get_model_id';

/** Filter dimension for the model creator, surfaced as the "Model family" filter. */
export const EIS_PROVIDER_FILTER_ID = 'provider';

/** Filter dimension for the task-type category (`LLM`, `Embedding`, `Rerank`). */
export const EIS_CATEGORY_FILTER_ID = 'category';

/** Sort field for the model name; matches the `Column.Name` id. */
export const EIS_NAME_SORT_FIELD = 'title';

/** Sort field for the type column. */
export const EIS_TYPE_SORT_FIELD = 'categories';

/** Sort field for the released column. */
export const EIS_RELEASED_SORT_FIELD = 'released';

/** Sort field for the end of life column. */
export const EIS_END_OF_LIFE_SORT_FIELD = 'endOfLife';

/** The grouped model travels on the item so cells and cards never re-derive it. */
export type EisContentListItem = ContentListItem & {
  model: GroupedModel;
  /** Absent when the first endpoint carries no `model_id`; the detail flyout cannot open without it. */
  modelId?: string;
};

export const toContentListItem = (model: GroupedModel): EisContentListItem => {
  // `getModelId` yields `''` for endpoints whose `model_id` is blank.
  const modelId = getModelId(model.endpoints[0]) || undefined;
  return {
    id: modelId ?? `${model.service}::${model.modelName}`,
    title: model.modelName,
    model,
    ...(modelId && { modelId }),
  };
};

export const toGroupedModel = (item: ContentListItem): GroupedModel =>
  (item as EisContentListItem).model;

export const getItemModelId = (item: ContentListItem): string | undefined =>
  (item as EisContentListItem).modelId;

const getIncludeExclude = (value: ActiveFilters[string]): Required<IncludeExcludeFilter> => {
  if (!value || typeof value !== 'object' || (!('include' in value) && !('exclude' in value))) {
    return { include: [], exclude: [] };
  }

  const { include = [], exclude = [] } = value as IncludeExcludeFilter;
  return { include, exclude };
};

const sortModels = (models: GroupedModel[], sort: FindItemsParams['sort']): GroupedModel[] => {
  const direction = sort?.direction === 'desc' ? -1 : 1;

  if (sort?.field === EIS_PROVIDER_FILTER_ID) {
    // Stable sort over name-ordered input, so equal creators stay alphabetical.
    return [...models].sort((a, b) => a.modelCreator.localeCompare(b.modelCreator) * direction);
  }

  if (sort?.field === EIS_TYPE_SORT_FIELD) {
    return [...models].sort(
      (a, b) => a.categories.join(', ').localeCompare(b.categories.join(', ')) * direction
    );
  }

  if (sort?.field === EIS_RELEASED_SORT_FIELD || sort?.field === EIS_END_OF_LIFE_SORT_FIELD) {
    const readDate = sort.field === EIS_RELEASED_SORT_FIELD ? getModelReleaseDate : getModelEOLDate;
    return [...models].sort((a, b) => {
      const aDate = readDate(a.modelMetadata);
      const bDate = readDate(b.modelMetadata);
      if (!aDate && !bDate) {
        return 0;
      }
      if (!aDate) {
        return 1;
      }
      if (!bDate) {
        return -1;
      }
      return (aDate.valueOf() - bDate.valueOf()) * direction;
    });
  }

  // `filterGroupedModels` already sorts by name ascending.
  return sort?.direction === 'desc' ? [...models].reverse() : models;
};

/**
 * Builds the Content List data source over an already-fetched set of grouped
 * models. Filtering delegates to {@link filterGroupedModels} so the listing and
 * the model detail flyout stay in agreement about what matches a query.
 */
export const createEisFindItems =
  (
    models: GroupedModel[],
    displayOptions: EisDisplayOptions = DEFAULT_EIS_DISPLAY_OPTIONS,
    paginate = true
  ): FindItemsFn =>
  async ({ searchQuery, filters, sort, page }) => {
    const providerFilter = getIncludeExclude(filters[EIS_PROVIDER_FILTER_ID]);
    const categoryFilter = getIncludeExclude(filters[EIS_CATEGORY_FILTER_ID]);
    const selectedTaskTypes = new Set(categoryFilter.include as TaskTypeCategory[]);

    const matched = sortModels(
      filterGroupedModels(models, {
        searchQuery,
        selectedProviders: providerFilter.include,
        selectedTaskTypes,
        ...displayOptions,
      }).filter(
        ({ modelCreator, categories }) =>
          !providerFilter.exclude.includes(modelCreator) &&
          !categories.some((category) => categoryFilter.exclude.includes(category))
      ),
      sort
    );

    const start = page.index * page.size;
    const pageModels = paginate ? matched.slice(start, start + page.size) : matched;

    return { items: pageModels.map(toContentListItem), total: matched.length };
  };

/**
 * Registers the two custom dimensions with the search bar so `provider:` and
 * `category:` resolve in typed queries, not just via the toolbar controls.
 */
export const createEisFieldDefinitions = (models: GroupedModel[]): FieldDefinition[] => {
  const providers = getProviderOptions(models).map(({ key }) => key);
  const matchesPartial = (value: string, partial: string) =>
    value.toLowerCase().includes(partial.toLowerCase());

  return [
    {
      fieldName: EIS_PROVIDER_FILTER_ID,
      resolveIdToDisplay: (id) => id,
      resolveDisplayToId: (displayValue) =>
        providers.find((provider) => provider.toLowerCase() === displayValue.toLowerCase()),
      resolveFuzzyDisplayToIds: (displayValue) =>
        providers.filter((provider) => matchesPartial(provider, displayValue)),
    },
    {
      fieldName: EIS_CATEGORY_FILTER_ID,
      resolveIdToDisplay: (id) => MODEL_TYPE_FILTERS.find(({ key }) => key === id)?.label ?? id,
      resolveDisplayToId: (displayValue) =>
        MODEL_TYPE_FILTERS.find(({ label }) => label.toLowerCase() === displayValue.toLowerCase())
          ?.key,
      resolveFuzzyDisplayToIds: (displayValue) =>
        MODEL_TYPE_FILTERS.filter(({ label }) => matchesPartial(label, displayValue)).map(
          ({ key }) => key
        ),
    },
  ];
};
