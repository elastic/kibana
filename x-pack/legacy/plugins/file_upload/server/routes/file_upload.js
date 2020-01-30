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

function importData({ callWithRequest, id, index, settings, mappings, ingestPipeline, data }) {
  const { importData: importDataFunc } = importDataProvider(callWithRequest);
  return importDataFunc(id, index, settings, mappings, ingestPipeline, data);
}

const queryValidation = (data, { ok, badRequest }) => {
  const validQuery = schema
    .maybe(
      schema.object({
        id: schema.nullable(schema.string()),
      })
    )
    .validate(data);

  return validQuery ? ok(validQuery) : badRequest('Invalid query', ['query']);
};

const bodyValidation = (data, { ok, badRequest }) => {
  const validBody = schema
    .object(
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
    )
    .validate(data);

  return validBody ? ok(validBody) : badRequest('Invalid payload', ['body']);
};

const idConditionalValidation = (body, boolHasId) => {
  const validConditionalBodyParams = schema
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

  return validConditionalBodyParams;
};

const finishValidationAndProcessReq = (elasticsearchPlugin, getSavedObjectsRepository) => {
  return async (con, req, { ok, badRequest }) => {
    const {
      query: { id },
      body,
    } = req;
    const boolHasId = !!id;
    const validIdReqData = idConditionalValidation(body, boolHasId);

    let resp;
    try {
      const processedReq = await importData({
        id,
        callWithRequest: callWithRequestFactory(elasticsearchPlugin, validIdReqData),
        ...validIdReqData,
      });
      if (processedReq.success) {
        resp = ok({ body: processedReq });
        // If no id's been established then this is a new index, update telemetry
        if (!boolHasId) {
          await updateTelemetry({ elasticsearchPlugin, getSavedObjectsRepository });
        }
      } else {
        resp = badRequest(`Error processing request: ${processedReq.error.message}`, ['body']);
      }
    } catch (e) {
      resp = badRequest(`Error processing request: : ${e.message}`, ['body']);
    }
    return resp;
  };
};

export const initRoutes = (router, esPlugin, getSavedObjectsRepository) => {
  const options = {
    body: {
      maxBytes: MAX_BYTES,
      accepts: ['application/json'],
    },
  };

  router.post(
    {
      path: `${IMPORT_ROUTE}{id?}`,
      validate: {
        query: queryValidation,
        body: bodyValidation,
      },
      options,
    },
    finishValidationAndProcessReq(esPlugin, getSavedObjectsRepository)
  );
};
