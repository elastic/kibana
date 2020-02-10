/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { importDataProvider } from '../models/import_data';
import { updateTelemetry } from '../telemetry/telemetry';
import { MAX_BYTES } from '../../common/constants/file_import';
import { schema } from '@kbn/config-schema';

export const IMPORT_ROUTE = '/api/fileupload/import';

export const querySchema = schema.maybe(
  schema.object({
    id: schema.nullable(schema.string()),
  })
);

export const bodySchema = schema.object(
  {
    app: schema.maybe(schema.string()),
    index: schema.string(),
    fileType: schema.string(),
    ingestPipeline: schema.maybe(
      schema.object(
        {},
        {
          defaultValue: {},
          allowUnknowns: true,
        }
      )
    ),
  },
  { allowUnknowns: true }
);

const options = {
  body: {
    maxBytes: MAX_BYTES,
    accepts: ['application/json'],
  },
};

export const idConditionalValidation = (body, boolHasId) =>
  schema
    .object(
      {
        data: boolHasId
          ? schema.arrayOf(schema.object({}, { allowUnknowns: true }), { minSize: 1 })
          : schema.any(),
        settings: boolHasId
          ? schema.any()
          : schema.object(
              {},
              {
                defaultValue: {
                  number_of_shards: 1,
                },
                allowUnknowns: true,
              }
            ),
        mappings: boolHasId
          ? schema.any()
          : schema.object(
              {},
              {
                defaultValue: {},
                allowUnknowns: true,
              }
            ),
      },
      { allowUnknowns: true }
    )
    .validate(body);

const finishValidationAndProcessReq = (elasticsearchPlugin, getSavedObjectsRepository) => {
  return async (con, req, { ok, badRequest }) => {
    const {
      query: { id },
      body,
    } = req;
    const boolHasId = !!id;

    let resp;
    try {
      const validIdReqData = idConditionalValidation(body, boolHasId);
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, req);
      const { importData: importDataFunc } = importDataProvider(callWithRequest);

      const { index, settings, mappings, ingestPipeline, data } = validIdReqData;
      const processedReq = await importDataFunc(
        id,
        index,
        settings,
        mappings,
        ingestPipeline,
        data
      );

      if (processedReq.success) {
        resp = ok({ body: processedReq });
        // If no id's been established then this is a new index, update telemetry
        if (!boolHasId) {
          await updateTelemetry({ elasticsearchPlugin, getSavedObjectsRepository });
        }
      } else {
        resp = badRequest(`Error processing request 1: ${processedReq.error.message}`, ['body']);
      }
    } catch (e) {
      resp = badRequest(`Error processing request 2: : ${e.message}`, ['body']);
    }
    return resp;
  };
};

export const initRoutes = (router, esPlugin, getSavedObjectsRepository) => {
  router.post(
    {
      path: `${IMPORT_ROUTE}{id?}`,
      validate: {
        query: querySchema,
        body: bodySchema,
      },
      options,
    },
    finishValidationAndProcessReq(esPlugin, getSavedObjectsRepository)
  );
};
