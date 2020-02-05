/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { createCallApmApi } from './createCallApmApi';

export const createStaticIndexPattern = async (http: HttpSetup) => {
  const callApmApi = createCallApmApi(http);
  return await callApmApi({
    method: 'POST',
    pathname: '/api/apm/index_pattern/static'
  });
};
