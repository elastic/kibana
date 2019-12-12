/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRequestInspectorStats, getResponseInspectorStats } from '../../../../../src/legacy/ui/public/courier';
import { esFilters } from '../../../../../src/plugins/data/public';
import { npStart } from 'ui/new_platform';

export const SPATIAL_FILTER_TYPE = esFilters.FILTERS.SPATIAL_FILTER;
export { SearchSource } from '../../../../../src/legacy/ui/public/courier';
export const indexPatternService = npStart.plugins.data.indexPatterns;

export const license = {};
export const setLicenseId = latestLicenseId => license.id = latestLicenseId;

export async function fetchSearchSourceAndRecordWithInspector({
  searchSource,
  requestId,
  requestName,
  requestDesc,
  inspectorAdapters,
  abortSignal,
}) {
  const inspectorRequest = inspectorAdapters.requests.start(
    requestName,
    { id: requestId, description: requestDesc });
  let resp;
  try {
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then(body => {
      inspectorRequest.json(body);
    });
    resp = await searchSource.fetch({ abortSignal });
    inspectorRequest
      .stats(getResponseInspectorStats(searchSource, resp))
      .ok({ json: resp });
  } catch(error) {
    inspectorRequest.error({ error });
    throw error;
  }

  return resp;
}
