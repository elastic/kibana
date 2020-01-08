/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { npStart } from '../../../../legacy_singletons';
import {
  LOG_ANALYSIS_VALIDATE_INDICES_PATH,
  ValidationIndicesFieldSpecification,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
} from '../../../../../common/http_api';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

export const callValidateIndicesAPI = async (
  indices: string[],
  fields: ValidationIndicesFieldSpecification[]
) => {
  const response = await npStart.http.fetch(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
    method: 'POST',
    body: JSON.stringify(validationIndicesRequestPayloadRT.encode({ data: { indices, fields } })),
  });

  return pipe(
    validationIndicesResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
