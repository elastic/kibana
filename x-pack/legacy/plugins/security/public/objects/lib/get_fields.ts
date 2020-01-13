/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IHttpResponse } from 'angular';
import chrome from 'ui/chrome';

const apiBase = chrome.addBasePath(`/internal/security/fields`);

export async function getFields($http: any, query: string): Promise<string[]> {
  return await $http
    .get(`${apiBase}/${query}`)
    .then((response: IHttpResponse<string[]>) => response.data || []);
}
