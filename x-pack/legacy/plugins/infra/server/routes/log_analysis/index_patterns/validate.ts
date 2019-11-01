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

      const errors: IndexPatternValidateError[] = [];

      // TODO: Write actual validation

      return res.response(indexPatternsValidateResponsePayloadRT.encode({ data: { errors } }));
    },
  });
};
