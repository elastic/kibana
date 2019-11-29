/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { kfetch } from 'ui/kfetch';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

import {
  LogsSummaryRequest,
  LOGS_SUMMARY_PATH,
  logsSummaryRequestRT,
  logsSummaryResponseRT,
} from '../../../../../common/http_api';

export const fetchLogSummary = async (requestArgs: LogsSummaryRequest) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOGS_SUMMARY_PATH,
    body: JSON.stringify(logsSummaryRequestRT.encode(requestArgs)),
  });

  return pipe(
    logsSummaryResponseRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
