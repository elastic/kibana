/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { UptimeUrlParams } from './url_params';

export const stringifyUrlParams = (params: Partial<UptimeUrlParams>, ignoreEmpty = false) => {
  if (ignoreEmpty) {
    Object.keys(params).forEach((key: string) => {
      // @ts-ignore
      const val = params[key];
      if (val == null || val === '') {
        // @ts-ignore
        delete params[key];
      }
    });
  }
  return `?${qs.stringify(params)}`;
};
