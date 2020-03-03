/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from '../../../../../../../target/types/core/public';

interface KibanaHttpProp {
  http: HttpSetup;
}

export const KIBANA_HTTP: KibanaHttpProp = {
  http: null,
};

export const fetchGet = (apiUrl: string) => {
  return KIBANA_HTTP.http.get(apiUrl);
};

export const fetchPost = (apiUrl: string, data: any) => {
  return KIBANA_HTTP.http.post(apiUrl, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchDelete = (apiUrl: string) => {
  return KIBANA_HTTP.http.delete(apiUrl);
};
