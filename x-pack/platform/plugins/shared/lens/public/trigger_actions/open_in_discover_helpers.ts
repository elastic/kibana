/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Filter,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { Serializable, SerializableRecord } from '@kbn/utility-types';
import {
  apiHasSerializableState,
  apiHasType,
  apiHasUniqueId,
  type EmbeddableApiContext,
} from '@kbn/presentation-publishing';
import type { LensApi } from '@kbn/lens-common-2';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import type { ESQLControlState } from '@kbn/esql-types';
import { apiIsPresentationContainer } from '@kbn/presentation-containers/interfaces/presentation_container';
import { isControlGroupRendererApi } from '@kbn/control-group-renderer';
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
  // we don't want to pass the DSL filters when navigating from an ES|SQL embeddable
  let filtersToApply = embeddable.isTextBasedLanguage()
    ? []
    : [...(filters || []), ...args.filters];
  let timeRangeToApply = args.timeRange;
  // if the target data view is time based, attempt to split out a time range from the provided filters
  if (dataView.isTimeBased() && dataView.timeFieldName === timeFieldName) {
    const { extractTimeRange } = await import('@kbn/es-query');
    const { restOfFilters, timeRange } = extractTimeRange(filters || [], timeFieldName);
    filtersToApply = restOfFilters;
    if (timeRange) {
      timeRangeToApply = timeRange;
    }
  }

  const esqlControls = getEsqlControls(embeddable);

  return {
    ...args,
    timeRange: timeRangeToApply,
    filters: filtersToApply,
    esqlControls,
  };
}

function getEsqlControls(embeddable: LensApi) {
  const state = embeddable.getSerializedStateByValue();
  if (!state) return null;

  const embeddableQuery = state.query;
  if (!isOfAggregateQueryType(embeddableQuery)) return null;

  const parentApi = embeddable.parentApi;
  if (!apiIsPresentationContainer(parentApi)) return null;

  const usedVariables = getESQLQueryVariables(embeddableQuery.esql);
  const controlsLayout = isControlGroupRendererApi(parentApi) ? parentApi.getControls() : {};
  const esqlControlState = Object.values(parentApi.children$.getValue()).reduce(
    (acc: { [uuid: string]: Serializable }, api, index) => {
      if (
        !(
          apiHasType(api) &&
          api.type === ESQL_CONTROL &&
          apiHasUniqueId(api) &&
          apiHasSerializableState(api)
        )
      ) {
        return acc;
      }

      const controlState = api.serializeState() as ESQLControlState;
      const variableName = 'variableName' in controlState && (controlState.variableName as string);
      if (!variableName) return acc;
      const isUsed = usedVariables.includes(variableName);
      if (!isUsed) return acc;

      return {
        ...acc,
        [api.uuid]: {
          type: api.type,
          ...controlState,
          ...(controlsLayout[api.uuid]
            ? {
                ...omit(controlsLayout[api.uuid], 'type'),
              }
            : { order: index }),
        },
      };
    },
    {}
  );

  return esqlControlState;
}

export async function getHref({ embeddable, locator, filters, dataViews, timeFieldName }: Context) {
  const params = await getDiscoverLocationParams({
    embeddable,
    filters,
    dataViews,
    timeFieldName,
  });

  const discoverUrl = locator?.getRedirectUrl(params);

  return discoverUrl;
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
