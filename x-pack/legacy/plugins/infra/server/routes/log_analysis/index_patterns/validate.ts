/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_VALIDATION_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
  ValidationIndicesError,
} from '../../../../common/http_api';

import { throwErrors } from '../../../../common/runtime_types';

const partitionField = 'event.dataset';
const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initIndexPatternsValidateRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ANALYSIS_VALIDATION_INDICES_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          validationIndicesRequestPayloadRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { timestampField, indices } = payload.data;
        const errors: ValidationIndicesError[] = [];

        // Query each pattern individually, to map correctly the errors
        await Promise.all(
          indices.map(async index => {
            const fieldCaps = await framework.callWithRequest(requestContext, 'fieldCaps', {
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
        return response.ok({
          body: validationIndicesResponsePayloadRT.encode({ data: { errors } }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
