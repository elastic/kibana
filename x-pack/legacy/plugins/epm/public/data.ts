/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpHandler } from 'src/core/public';
import {
  getCategoriesPath,
  getFilePath,
  getInfoPath,
  getInstallDatasourcePath,
  getInstallPath,
  getListPath,
  getListPoliciesPath,
  getRemovePath,
  ListParams,
} from '../common/routes';
import {
  AssetReference,
  CategorySummaryList,
  PackageInfo,
  PackageList,
  PackagesGroupedByStatus,
  DatasourcePayload,
} from '../common/types';
import { ReturnTypeList } from '../../ingest/common/types/std_return_format';

const defaultClient: HttpHandler = (path, options?) => fetch(path, options).then(res => res.json());

let _fetch: HttpHandler = defaultClient;

export function setClient(client: HttpHandler): void {
  _fetch = client;
}

export async function getCategories(): Promise<CategorySummaryList> {
  const path = getCategoriesPath();
  return _fetch(path);
}

export async function getPackages(params?: ListParams): Promise<PackageList> {
  const path = getListPath();
  const options = params ? { query: { ...params } } : undefined;
  return _fetch(path, options);
}

export async function getPackagesGroupedByStatus() {
  const path = getListPath();
  const list: PackageList = await _fetch(path);
  const initialValue: PackagesGroupedByStatus = {
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

export async function getPackageInfoByKey(pkgkey: string): Promise<PackageInfo> {
  const path = getInfoPath(pkgkey);
  return _fetch(path);
}

export async function installPackage(pkgkey: string): Promise<AssetReference[]> {
  const path = getInstallPath(pkgkey);
  return _fetch(path);
}

export async function removePackage(pkgkey: string): Promise<AssetReference[]> {
  const path = getRemovePath(pkgkey);
  return _fetch(path);
}

export async function getFileByPath(filePath: string): Promise<string> {
  const path = getFilePath(filePath);
  return _fetch(path);
}

export async function installDatasource(datasource: DatasourcePayload): Promise<AssetReference[]> {
  const path = getInstallDatasourcePath();
  const body = JSON.stringify(datasource);
  return _fetch(path, { body, method: 'POST' });
}

// TODO: This should come from the shared Ingest types
// However, they are in a /server directory so /public/* cannot access them
// Using this partial/placeholder type until we can figure out how to share
interface PlaceholderPolicy {
  name: string;
  id: string;
}

export async function getPolicies(): Promise<ReturnTypeList<PlaceholderPolicy>> {
  const path = getListPoliciesPath();
  return _fetch(path);
}
