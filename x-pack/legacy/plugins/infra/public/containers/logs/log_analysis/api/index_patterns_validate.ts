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
  LOG_ANALYSIS_INDEX_PATTERNS_VALIDATE_PATH,
  indexPatternsValidateRequestPayloadRT,
  indexPatternsValidateResponsePayloadRT,
} from '../../../../../common/http_api';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

export const callIndexPatternsValidate = async ({
  timestamp,
  indexPatternName,
}: {
  timestamp: string;
  indexPatternName: string;
}) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ANALYSIS_INDEX_PATTERNS_VALIDATE_PATH,
    body: JSON.stringify(
      indexPatternsValidateRequestPayloadRT.encode({ data: { timestamp, indexPatternName } })
    ),
  });

  return pipe(
    indexPatternsValidateResponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
