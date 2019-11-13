/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_VALIDATION_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
  ValidationIndicesError,
} from '../../../../common/http_api';

import { throwErrors } from '../../../../common/runtime_types';

export const initIndexPatternsValidateRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_VALIDATION_INDICES_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        validationIndicesRequestPayloadRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { timestamp } = payload.data;
      const indices = payload.data.indices.split(',');
      const errors: ValidationIndicesError[] = [];

      // Query each pattern individually, to map correctly the errors
      await Promise.all(
        indices.map(async index => {
          const esIndices = await framework.callWithRequest(req, 'indices.get', {
            index,
          });

          const indexNames = Object.keys(esIndices);

          if (indexNames.length === 0) {
            errors.push({
              error: 'INDEX_NOT_FOUND',
              index,
            });
            return;
          }

          indexNames.forEach(indexName => {
            const metadata = esIndices[indexName];
            const timestampProperty = metadata.mappings.properties[timestamp];

            if (!timestampProperty) {
              errors.push({
                error: 'TIMESTAMP_NOT_FOUND',
                index: indexName,
                timestamp,
              });
            } else if (timestampProperty.type !== 'date') {
              errors.push({
                error: 'TIMESTAMP_NOT_VALID',
                index: indexName,
                timestamp,
              });
            }
          });
        })
      );

      return res.response(validationIndicesResponsePayloadRT.encode({ data: { errors } }));
    },
  });
};
