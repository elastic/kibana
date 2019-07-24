/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { callApi } from './callApi';

export interface ISavedObject {
  attributes: {
    title: string;
  };
  id: string;
  type: string;
}

export const getAPMIndexPattern = memoize(async () => {
  try {
    return await callApi<ISavedObject>({
      method: 'GET',
      pathname: `/api/apm/index_pattern`
    });
  } catch (error) {
    return;
  }
});
