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
import { schema } from '@kbn/config-schema';

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

const validateBodySchema = (data, idRef) => {
  const idExists = schema.string({ validate: value => !!value ? undefined : 'No id'});
  const bodySchema = schema.object({
      app: schema.maybe(schema.string()),
      index: schema.string(),
      data: schema.conditional(
        idRef,
        idExists,
        schema.arrayOf(schema.object({}, { allowUnknowns: true }), { minSize: 1 }),
        schema.any(),
      ),
      fileType: schema.string(),
      ingestPipeline: schema.maybe(schema.object(
        {},
        {
          defaultValue: {},
          allowUnknowns: true
        }
      )),
      settings: schema.conditional(
        idRef,
        idExists,
        schema.any(),
        schema.object({}, { allowUnknowns: true }),
      ),
      mappings: schema.conditional(
        idRef,
        idExists,
        schema.any(),
        schema.object({}, { allowUnknowns: true }),
      ),
    },
    { allowUnknowns: true }
  );
  return bodySchema.validate(data);
};

export const initRoutes = (router, esPlugin, getSavedObjectsRepository) => {
  router.post({
      path: `${IMPORT_ROUTE}{id?}`,
      validate: {
        params: schema.maybe(schema.object({id: schema.nullable(schema.string())})),
        body: (data, { ok, badRequest }) => {
          const idRef = schema.siblingRef('params.id');
          return validateBodySchema(data, idRef)
            ? ok(data)
            : badRequest('Invalid payload', ['body']);
        },
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
