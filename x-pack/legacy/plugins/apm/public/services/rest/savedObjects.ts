/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { memoize } from 'lodash';
import { callApmApi } from './callApmApi';

export interface ISavedObject {
  attributes: {
    title: string;
    fields: string;
  };
  id: string;
  type: string;
}

export const getAPMIndexPattern = memoize(async () => {
  try {
    return await callApmApi({
      pathname: '/api/apm/index_pattern'
    });
  } catch (error) {
    return;
  }
});
