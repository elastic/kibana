/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isRight } from 'fp-ts/lib/Either';
import { getApiPath } from '../../lib/helper';
import { REST_API_URLS } from '../../../common/constants/rest_api';
import { StatesIndexStatus, StatesIndexStatusType } from '../../../common/runtime_types';

interface ApiRequest {
  basePath: string;
}

export const fetchIndexStatus = async ({ basePath }: ApiRequest): Promise<StatesIndexStatus> => {
  const url = getApiPath(REST_API_URLS.INDEX_STATUS, basePath);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  const responseData = await response.json();
  const decoded = StatesIndexStatusType.decode(responseData);
  PathReporter.report(decoded);
  if (isRight(decoded)) {
    return decoded.right;
  }
  throw PathReporter.report(decoded);
};
