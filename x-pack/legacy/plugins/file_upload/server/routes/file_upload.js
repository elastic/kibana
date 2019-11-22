/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { importDataProvider } from '../models/import_data';
import { updateTelemetry } from '../telemetry/telemetry';


function importData({
  callWithRequest, id, index, settings, mappings, ingestPipeline, data
}) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function getImportRouteHandler(elasticsearchPlugin, getSavedObjectsRepository) {
  return async request => {

    const requestObj = {
      query: request.query,
      payload: request.payload,
      params: request.payload,
      auth: request.auth,
      headers: request.headers
    };

    // `id` being `undefined` tells us that this is a new import due to create a new index.
    // follow-up import calls to just add additional data will include the `id` of the created
    // index, we'll ignore those and don't increment the counter.
    const { id } = requestObj.query;
    if (id === undefined) {
      await updateTelemetry({ elasticsearchPlugin, getSavedObjectsRepository });
    }

    const requestContentWithDefaults = {
      id,
      callWithRequest: callWithRequestFactory(elasticsearchPlugin, requestObj),
      index: undefined,
      settings: {},
      mappings: {},
      ingestPipeline: {},
      data: [],
      ...requestObj.payload
    };
    return importData(requestContentWithDefaults).catch(wrapError);
  };
}
