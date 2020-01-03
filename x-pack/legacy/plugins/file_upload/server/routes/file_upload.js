/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { importDataProvider } from '../models/import_data';
import { updateTelemetry } from '../telemetry/telemetry';
import { MAX_BYTES } from '../../common/constants/file_import';
import Joi from 'joi';
import { schema } from '@kbn/config-schema';
import { inspect } from 'util' // or directly;


export const IMPORT_ROUTE = '/api/fileupload/import';

function importData({ callWithRequest, id, index, settings, mappings, ingestPipeline, data }) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

export function getImportRouteHandler(elasticsearchPlugin, getSavedObjectsRepository) {
  return async (con, req, res) => {
    const requestObj = {
      query: req.query,
      body: req.body,
      params: req.params,
      headers: req.headers,
    };

    // `id` being `undefined` tells us that this is a new import due to create a new index.
    // follow-up import calls to just add additional data will include the `id` of the created
    // index, we'll ignore those and don't increment the counter.
    const { id } = requestObj.params;
    if (!id) {
      await updateTelemetry({ elasticsearchPlugin, getSavedObjectsRepository });
    }

    const requestContentWithDefaults = {
      id,
      callWithRequest: callWithRequestFactory(elasticsearchPlugin, requestObj),
      ...requestObj.body,
    };
    const importDataResult = await importData(requestContentWithDefaults).catch(wrapError);
    return res.ok({
      body: importDataResult
    });
  };
}

export const importRouteConfig = {
  // payload: {
  //   maxBytes: MAX_BYTES,
  // },
  validate: {
    query: Joi.object().keys({
      id: Joi.string(),
    }),
    body: Joi.object({
      app: Joi.string(),
      index: Joi.string()
        .min(1)
        .required(),
      data: Joi.array()
        .when(Joi.ref('$query.id'), {
          is: Joi.exist(),
          then: Joi.array()
            .min(1)
            .required(),
        })
        .default([]),
      fileType: Joi.string().required(),
      ingestPipeline: Joi.object().default({}),
      settings: Joi.object()
        .when(Joi.ref('$query.id'), {
          is: null,
          then: Joi.required(),
        })
        .default({}),
      mappings: Joi.object().when(Joi.ref('$query.id'), {
        is: null,
        then: Joi.required(),
      }),
    }).required(),
  },
};

export const initRoutes = (router, esPlugin, getSavedObjectsRepository) => {
  router.post({
    path: `${IMPORT_ROUTE}{id?}`,
    validate: {
      params: schema.maybe(schema.any()),
      query: schema.object({}, { allowUnknowns: true }),
      body: schema.object({}, { allowUnknowns: true }),
    },
    options: {
      body: {
        maxBytes: MAX_BYTES,
        accepts: ['application/json'],
      },
    },
  },
    getImportRouteHandler(esPlugin, getSavedObjectsRepository)
  );
};
