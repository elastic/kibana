/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { i18n } from '@kbn/i18n';

import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_INDEX_PATTERNS_VALIDATE_PATH,
  indexPatternsValidateRequestPayloadRT,
  indexPatternsValidateResponsePayloadRT,
  IndexPatternValidateError,
} from '../../../../common/http_api';

import { throwErrors } from '../../../../common/runtime_types';

export const initIndexPatternsValidateRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_INDEX_PATTERNS_VALIDATE_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        indexPatternsValidateRequestPayloadRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { timestamp, indexPatternName } = payload.data;
      const indexPatterns = indexPatternName.split(',');
      const errors: IndexPatternValidateError[] = [];

      // Query each pattern individually, to map correctly the errors
      await Promise.all(
        indexPatterns.map(async indexPattern => {
          const indices = await framework.callWithRequest(req, 'indices.get', {
            index: indexPattern,
          });

          const indexNames = Object.keys(indices);

          if (indexNames.length === 0) {
            errors.push({
              indexPattern,
              error: 'INDEX_NOT_FOUND',
              message: i18n.translate('xpack.infra.mlValidation.noIndexFound', {
                defaultMessage: 'No indices match the pattern `{indexPattern}`',
                values: { indexPattern },
              }),
            });
            return;
          }

          indexNames.forEach(index => {
            const metadata = indices[index];
            const timestampProperty = metadata.mappings.properties[timestamp];

            if (!timestampProperty) {
              errors.push({
                indexPattern,
                error: 'TIMESTAMP_NOT_FOUND',
                message: i18n.translate('xpack.infra.mlValidation.noTimestampField', {
                  defaultMessage:
                    'Index `{index}` has no field `{timestamp}`. Ensure the "Timestamp" field in your settings exists in all indices.',
                  values: { index, timestamp },
                }),
              });
            } else if (timestampProperty.type !== 'date') {
              errors.push({
                indexPattern,
                error: 'TIMESTAMP_NOT_VALID',
                message: i18n.translate('xpack.infra.mlValidation.invalidTimestampField', {
                  defaultMessage:
                    'Field `{timestamp}` in index `{index}` is not of type `date`. Ensure the "Timestamp" field in your settings has `date` type.',
                  values: { index, timestamp },
                }),
              });
            }
          });
        })
      );

      return res.response(indexPatternsValidateResponsePayloadRT.encode({ data: { errors } }));
    },
  });
};
