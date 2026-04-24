/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Filter,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import {
  type EmbeddableApiContext,
  apiIsPresentationContainer,
} from '@kbn/presentation-publishing';
import {
  appendEsqlFilterExpressionToQuery,
  convertFiltersToESQLExpression,
  getEsqlControls,
} from '@kbn/esql-utils';
import { isLensApi } from '../react_embeddable/type_guards';

interface DiscoverAppLocatorParams extends SerializableRecord {
  timeRange?: TimeRange;
  filters?: Filter[];
  indexPatternId?: string;
  query?: Query | AggregateQuery | undefined;
  columns?: string[];
}

export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;

type Context = EmbeddableApiContext & {
  filters?: Filter[];
  openInSameTab?: boolean;
  hasDiscoverAccess: boolean;
  dataViews: Pick<DataViewsService, 'get'>;
  locator?: DiscoverAppLocator;
  timeFieldName?: string;
};

export function isCompatible({ hasDiscoverAccess, embeddable }: Context) {
  if (!hasDiscoverAccess) return false;
  try {
    return isLensApi(embeddable) && embeddable.canViewUnderlyingData$.getValue();
  } catch (e) {
    // Fetching underlying data failed, log the error and behave as if the action is not compatible
    // eslint-disable-next-line no-console
    console.error(e);
    return false;
  }
}

const getQueryWithFilter = (
  originalQuery: Query | AggregateQuery | undefined,
  filtersToApply: Filter[]
): {
  query: Query | AggregateQuery | undefined;
  untranslatableFilters: Filter[];
} => {
  if (!filtersToApply.length) {
    return { query: originalQuery, untranslatableFilters: [] };
  }

  if (!isOfAggregateQueryType(originalQuery) || !originalQuery.esql?.trim()) {
    return { query: originalQuery, untranslatableFilters: filtersToApply };
  }

  const { esqlExpression, untranslatableFilters } = convertFiltersToESQLExpression(filtersToApply);
  if (!esqlExpression) {
    return { query: originalQuery, untranslatableFilters };
  }

  return {
    query: {
      esql: appendEsqlFilterExpressionToQuery(originalQuery.esql, esqlExpression),
    },
    untranslatableFilters,
  };
};

async function getDiscoverLocationParams({
  embeddable,
  filters,
  dataViews,
  timeFieldName,
}: Pick<Context, 'dataViews' | 'embeddable' | 'filters' | 'timeFieldName'>) {
  if (!isLensApi(embeddable)) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Can only be executed in the context of Lens visualization');
  }

  const args = embeddable.getViewUnderlyingDataArgs();
  if (!args) {
    // shouldn't be executed because of the isCompatible check
    throw new Error('Underlying data is not ready');
  }

  const dataView = await dataViews.get(args.dataViewSpec.id!);

  let filtersToApply = [...(filters || []), ...args.filters];
  let timeRangeToApply = args.timeRange;

  const shouldExtractTimeRangeForDiscover =
    timeFieldName && dataView.isTimeBased() && dataView.timeFieldName === timeFieldName;
  if (shouldExtractTimeRangeForDiscover) {
    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters, timeRange } = extractTimeRange(filtersToApply, timeFieldName);
    filtersToApply = restOfFilters;
    if (timeRange) {
      timeRangeToApply = timeRange;
    }
  }

  const presentationContainer = apiIsPresentationContainer(embeddable.parentApi)
    ? embeddable.parentApi
    : undefined;

  const shouldMergeFiltersIntoEsql = embeddable.isTextBasedLanguage() && filtersToApply.length > 0;

  let discoverQuery: AggregateQuery | Query | undefined = args.query;
  let untranslatableFilters: Filter[] = [];
  if (shouldMergeFiltersIntoEsql) {
    const merged = getQueryWithFilter(args.query, filtersToApply);
    discoverQuery = merged.query;
    untranslatableFilters = merged.untranslatableFilters;
  }

  // Translatable filter predicates are merged into the ES|QL string; the rest stay as Kibana filter pills
  const filtersForDiscover = shouldMergeFiltersIntoEsql ? untranslatableFilters : filtersToApply;

  const esqlQueryForControls = shouldMergeFiltersIntoEsql ? discoverQuery : args.query;

  return {
    ...args,
    query: discoverQuery,
    filters: filtersForDiscover,
    timeRange: timeRangeToApply,
    esqlControls: presentationContainer
      ? getEsqlControls(presentationContainer, esqlQueryForControls)
      : undefined,
  };
}

export async function getHref({ embeddable, locator, filters, dataViews, timeFieldName }: Context) {
  const params = await getDiscoverLocationParams({
    embeddable,
    filters,
    dataViews,
    timeFieldName,
  });

  return locator?.getRedirectUrl(params);
}

export async function getLocation({
  embeddable,
  locator,
  filters,
  dataViews,
  timeFieldName,
}: Context) {
  const params = await getDiscoverLocationParams({
    embeddable,
    filters,
    dataViews,
    timeFieldName,
  });

  const discoverLocation = locator?.getLocation(params);

  if (!discoverLocation) {
    throw new Error('Discover location not found');
  }

  return discoverLocation;
}

export async function execute({
  embeddable,
  locator,
  filters,
  openInSameTab,
  dataViews,
  timeFieldName,
  hasDiscoverAccess,
}: Context) {
  const discoverUrl = await getHref({
    embeddable,
    locator,
    filters,
    dataViews,
    timeFieldName,
    hasDiscoverAccess,
  });
  window.open(discoverUrl, !openInSameTab ? '_blank' : '_self');
}
