/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpHandler } from 'src/core/public';
import {
  getCategoriesPath,
  getInfoPath,
  getInstallPath,
  getListPath,
  getRemovePath,
  ListParams,
} from '../common/routes';
import {
  CategorySummaryList,
  IntegrationInfo,
  IntegrationList,
  IntegrationsGroupedByStatus,
} from '../common/types';

let _fetch: HttpHandler;

export function setClient(client: HttpHandler): void {
  _fetch = client;
}

export async function getCategories(): Promise<CategorySummaryList> {
  const path = getCategoriesPath();
  const list: CategorySummaryList = await _fetch(path);

  return list;
}

export async function getIntegrations(params?: ListParams): Promise<IntegrationList> {
  const path = getListPath();
  const options = params ? { query: { ...params } } : undefined;
  const list: IntegrationList = await _fetch(path, options);

  return list;
}

export async function getIntegrationsGroupedByStatus() {
  const path = getListPath();
  const list: IntegrationList = await _fetch(path);
  const initialValue: IntegrationsGroupedByStatus = {
    installed: [],
    not_installed: [],
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
