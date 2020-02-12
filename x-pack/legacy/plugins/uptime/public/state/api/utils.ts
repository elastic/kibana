/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const KIBANA_HTTP = {
  http: null,
};

export const fetchGet = async (apiUrl: string) => {
  return await KIBANA_HTTP.http.get(apiUrl);
};

export const fetchPost = async (apiUrl: string, data: any) => {
  return await KIBANA_HTTP.http.post(apiUrl, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
