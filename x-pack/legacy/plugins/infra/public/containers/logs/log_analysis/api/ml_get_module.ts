/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import * as rt from 'io-ts';
import { kfetch } from 'ui/kfetch';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { jobCustomSettingsRT } from './ml_api_types';

export const callGetMlModuleAPI = async (moduleId: string) => {
  const response = await kfetch({
    method: 'GET',
    pathname: `/api/ml/modules/get_module/${moduleId}`,
  });

  return pipe(
    getMlModuleResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

const jobDefinitionRT = rt.type({
  id: rt.string,
  config: rt.type({
    custom_settings: jobCustomSettingsRT,
  }),
});

export type JobDefinition = rt.TypeOf<typeof jobDefinitionRT>;

const getMlModuleResponsePayloadRT = rt.type({
  id: rt.string,
  jobs: rt.array(jobDefinitionRT),
});

export type GetMlModuleResponsePayload = rt.TypeOf<typeof getMlModuleResponsePayloadRT>;
