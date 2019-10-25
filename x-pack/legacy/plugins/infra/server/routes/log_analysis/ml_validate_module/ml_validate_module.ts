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
  LOG_ANALYSIS_VALIDATE_ML_MODULE_PATH,
  validateMlModuleRequestPayloadRT,
  validateMlModuleResponsePayloadRT,
  ValidateMlModuleError,
} from '../../../../common/http_api';

import { throwErrors } from '../../../../common/runtime_types';

export const initMlValidateModuleRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_VALIDATE_ML_MODULE_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        validateMlModuleRequestPayloadRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const errors: ValidateMlModuleError[] = [];
      const { timestamp, indexPatternName } = payload.data;
      // 1. Check that any of the indices exist:
      const indices = await framework.callWithRequest(req, 'indices.get', {
        index: indexPatternName,
      });

      const indexNames = Object.keys(indices);

      if (indexNames.length === 0) {
        errors.push({
          field: 'indexPatternName',
          message: `No indices match the pattern \`${indexPatternName}\`.`,
        });
      } else {
        for (const index of indexNames) {
          const metadata = indices[index];
          if (!metadata.mappings.properties[timestamp]) {
            errors.push({
              field: 'timestamp',
              message: `Index \`${index}\` has no field \`${timestamp}\`. Ensure the "Timestamp" field in your settings exists in all indices.`,
            });
          } else if (metadata.mappings.properties[timestamp].type !== 'date') {
            errors.push({
              field: 'timestamp',
              message: `Field \`${timestamp}\` in index \`${index}\` is not of type \`date\`. Ensure the "Timestamp" field in your settings has \`date\` type.`,
            });
          }
        }
      }

      return res.response(
        validateMlModuleResponsePayloadRT.encode({
          data: {
            errors,
          },
        })
      );
    },
  });
};
