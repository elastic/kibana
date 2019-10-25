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
  getFilePath,
} from '../common/routes';
import {
  CategorySummaryList,
  PackageInfo,
  PackageList,
  PackagesGroupedByStatus,
} from '../common/types';

const defaultClient: HttpHandler = (path, options?) => fetch(path, options).then(res => res.json());

let _fetch: HttpHandler = defaultClient;

export function setClient(client: HttpHandler): void {
  _fetch = client;
}

export async function getCategories(): Promise<CategorySummaryList> {
  const path = getCategoriesPath();
  const list: CategorySummaryList = await _fetch(path);

  return list;
}

export async function getPackages(params?: ListParams): Promise<PackageList> {
  const path = getListPath();
  const options = params ? { query: { ...params } } : undefined;
  const list: PackageList = await _fetch(path, options);

  return list;
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
  const info: PackageInfo = await _fetch(path);

  return info;
}

export async function installPackage(pkgkey: string) {
  const path = getInstallPath(pkgkey);
  return _fetch(path);
}

export async function removePackage(pkgkey: string) {
  const path = getRemovePath(pkgkey);
  return _fetch(path);
}

export async function getFileByPath(filePath: string): Promise<string> {
  const path = getFilePath(filePath);
  return _fetch(path);
}
