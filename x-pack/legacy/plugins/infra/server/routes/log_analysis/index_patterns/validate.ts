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

const partitionField = 'event.dataset';

export const initIndexPatternsValidateRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_VALIDATION_INDICES_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        validationIndicesRequestPayloadRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { timestampField, indices } = payload.data;
      const errors: ValidationIndicesError[] = [];

      // Query each pattern individually, to map correctly the errors
      await Promise.all(
        indices.map(async index => {
          const fieldCaps = await framework.callWithRequest(req, 'fieldCaps', {
            index,
            fields: `${timestampField},${partitionField}`,
          });

          if (fieldCaps.indices.length === 0) {
            errors.push({
              error: 'INDEX_NOT_FOUND',
              index,
            });
            return;
          }

          ([
            [timestampField, 'date'],
            [partitionField, 'keyword'],
          ] as const).forEach(([field, fieldType]) => {
            const fieldMetadata = fieldCaps.fields[field];

            if (fieldMetadata === undefined) {
              errors.push({
                error: 'FIELD_NOT_FOUND',
                index,
                field,
              });
            } else {
              const fieldTypes = Object.keys(fieldMetadata);

              if (fieldTypes.length > 1 || fieldTypes[0] !== fieldType) {
                errors.push({
                  error: `FIELD_NOT_VALID`,
                  index,
                  field,
                });
              }
            }
          });
        })
      );

      return res.response(validationIndicesResponsePayloadRT.encode({ data: { errors } }));
    },
  });
};
