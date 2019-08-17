/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_ROUTE_SNAPSHOT } from '../../common/lib/constants';

import { fetch } from '../../common/lib/fetch';
import { CanvasRenderedWorkpad } from '../../external_runtime/types';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_SNAPSHOT}`;

interface OKResponse {
  ok: true;
}

export const create = (snapshot: CanvasRenderedWorkpad) => {
  return fetch.post<OKResponse>(apiPath, snapshot);
};

export const update = async (id: string, snapshot: CanvasRenderedWorkpad) => {
  return await fetch.put<OKResponse>(`${apiPath}/${id}`, snapshot);
};

export const remove = async (id: string) => {
  return await fetch.delete<OKResponse>(`${apiPath}/${id}`);
};
