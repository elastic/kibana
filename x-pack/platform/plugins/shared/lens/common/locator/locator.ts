/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type { SerializableRecord } from '@kbn/utility-types';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { LENS_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type {
  LensAppLocatorParams,
  MainHistoryLocationState,
  LensShareableState,
} from '@kbn/lens-common';
import { LENS_SHARE_STATE_ACTION } from '@kbn/lens-common';

function getStateFromParams(params: LensAppLocatorParams): MainHistoryLocationState['payload'] {
  if (params.savedObjectId) {
    return {};
  }

  // return no state for malformed state?
  if (
    !(
      params.activeDatasourceId &&
      params.datasourceStates &&
      params.visualization &&
      params.references
    )
  ) {
    return {};
  }
  const outputState: LensShareableState = {
    activeDatasourceId: params.activeDatasourceId,
    visualization: params.visualization,
    datasourceStates: Object.fromEntries(
      Object.entries(params.datasourceStates).map(([id, { state }]) => [id, state])
    ) as Record<string, { state: unknown }> & SerializableRecord,
    references: params.references,
  };
  if (params.dataViewSpecs) {
    outputState.dataViewSpecs = params.dataViewSpecs;
  }
  return outputState;
}

export class LensAppLocatorDefinition implements LocatorDefinition<LensAppLocatorParams> {
  public readonly id = LENS_APP_LOCATOR;

  public readonly getLocation = async (params: LensAppLocatorParams) => {
    const { filters, query, savedObjectId, resolvedDateRange, searchSessionId } = params;
    const appState = getStateFromParams(params);
    const queryState: GlobalQueryStateFromUrl = {};
    const { isFilterPinned } = await import('@kbn/es-query');

    if (query) {
      appState.query = query;
    }
    if (resolvedDateRange) {
      appState.resolvedDateRange = resolvedDateRange;
      queryState.time = { from: resolvedDateRange.fromDate, to: resolvedDateRange.toDate };
    }
    if (filters?.length) {
      appState.filters = filters;
      queryState.filters = filters?.filter((f) => !isFilterPinned(f));
    }

    const savedObjectPath = savedObjectId ? `/edit/${encodeURIComponent(savedObjectId)}` : '';
    const basepath = `${window.location.origin}${window.location.pathname}`;
    const url = new URL(basepath);
    url.hash = savedObjectPath;
    url.searchParams.append('_g', rison.encodeUnknown(queryState) || '');

    if (searchSessionId) {
      appState.searchSessionId = searchSessionId;
    }

    return {
      app: 'lens',
      path: url.href.replace(basepath, ''),
      state: { type: LENS_SHARE_STATE_ACTION, payload: appState },
    };
  };
}
