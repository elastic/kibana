/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { kfetch } from 'ui/kfetch';

import {
  LOG_ANALYSIS_VALIDATION_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
} from '../../../../../common/http_api';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

export const callIndexPatternsValidate = async (timestamp: string, indices: string) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ANALYSIS_VALIDATION_INDICES_PATH,
    body: JSON.stringify(
      validationIndicesRequestPayloadRT.encode({ data: { timestamp, indices } })
    ),
  });

  return pipe(
    validationIndicesResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
