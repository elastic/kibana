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
          const fieldCaps = await framework.callWithRequest(req, 'fieldCaps', {
            index,
            fields: timestamp,
          });

          if (fieldCaps.indices.length === 0) {
            errors.push({
              error: 'INDEX_NOT_FOUND',
              index,
            });
            return;
          }

          const fieldMetadata = fieldCaps.fields[timestamp];

          if (fieldMetadata === undefined) {
            errors.push({
              error: 'TIMESTAMP_NOT_FOUND',
              index,
              timestamp,
            });
          } else {
            const fieldTypes = Object.keys(fieldMetadata);

            if (fieldTypes.length > 1 || fieldTypes[0] !== 'date') {
              errors.push({
                error: 'TIMESTAMP_NOT_VALID',
                index,
                timestamp,
              });
            }
          }
        })
      );

      return res.response(validationIndicesResponsePayloadRT.encode({ data: { errors } }));
    },
  });
};
