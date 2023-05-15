/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';

export function getTileUrlParams(params: Record<string, unknown>) {
  const urlSearchParams = new URLSearchParams();
  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'object') {
      urlSearchParams.set(key, rison.encode(value));
      return;
    }

    urlSearchParams.set(key, value);
  });

  return urlSearchParams.toString();
}
