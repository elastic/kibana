/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier/utils/courier_inspector_utils';
export { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';

export { SearchSource } from 'ui/courier';
export const indexPatternService = data.indexPatterns.indexPatterns;

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
