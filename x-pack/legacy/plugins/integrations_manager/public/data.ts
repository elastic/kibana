/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
// disabling pending https://github.com/elastic/kibana/pull/42001
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { HttpHandler } from 'src/core/public/http';
import { STATUS_INSTALLED, STATUS_NOT_INSTALLED } from '../common/constants';
import { getInstallPath, getInfoPath, getListPath, getRemovePath } from '../common/routes';
import { IntegrationInfo, IntegrationList, IntegrationsGroupedByStatus } from '../common/types';

let _fetch: HttpHandler = npStart.core.http.fetch;

export function setClient(client: HttpHandler): void {
  _fetch = client;
}

export async function getIntegrations(): Promise<IntegrationList> {
  const path = getListPath();
  const list: IntegrationList = await _fetch(path);

  return list;
}

export async function getIntegrationsGroupedByStatus() {
  const path = getListPath();
  const list: IntegrationList = await _fetch(path);
  const initialValue: IntegrationsGroupedByStatus = {
    [STATUS_INSTALLED]: [],
    [STATUS_NOT_INSTALLED]: [],
  };

  const groupedByStatus = list.reduce((grouped, item) => {
    if (!grouped[item.status]) {
      grouped[item.status] = [];
    }
    grouped[item.status].push(item);

    return grouped;
  }, initialValue);

  return groupedByStatus;
}

export async function getIntegrationInfoByKey(pkgkey: string): Promise<IntegrationInfo> {
  const path = getInfoPath(pkgkey);
  const info: IntegrationInfo = await _fetch(path);

  return info;
}

export async function installIntegration(pkgkey: string) {
  const path = getInstallPath(pkgkey);
  return await _fetch(path);
}

export async function removeIntegration(pkgkey: string) {
  const path = getRemovePath(pkgkey);
  return await _fetch(path);
}
