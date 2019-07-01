/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
import { HttpHandler } from 'src/core/public/http';
import { IntegrationInfo, IntegrationList } from '../common/types';
import { getListPath, getInfoPath } from '../common/routes';

let _fetch: HttpHandler = npStart.core.http.fetch;

export function setClient(client: HttpHandler): void {
  _fetch = client;
}

export async function getIntegrationsList(): Promise<IntegrationList> {
  const path = getListPath();
  const list: IntegrationList = await _fetch(path);

  return list;
}

export async function getIntegrationInfoByKey(pkgkey: string): Promise<IntegrationInfo> {
  const path = getInfoPath(pkgkey);
  const info: IntegrationInfo = await _fetch(path);

  return info;
}
