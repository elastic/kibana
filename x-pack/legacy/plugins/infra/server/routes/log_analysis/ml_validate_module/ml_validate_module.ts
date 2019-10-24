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

      return res.response(payload);
    },
  });
};
