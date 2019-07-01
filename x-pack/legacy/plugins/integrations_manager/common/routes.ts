/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from './constants';

export const API_ROOT = `/api/${PLUGIN_ID}`;
export const API_LIST_PATTERN = `${API_ROOT}/list`;
export const API_INFO_PATTERN = `${API_ROOT}/package/{pkgkey}`;
export const API_ZIP_PATTERN = `${API_INFO_PATTERN}.zip`;
export const API_TGZ_PATTERN = `${API_INFO_PATTERN}.tar.gz`;

export function getListPath() {
  return API_LIST_PATTERN;
}

export function getInfoPath(pkgkey: string) {
  return API_INFO_PATTERN.replace('{pkgkey}', pkgkey);
}

export function getZipPath(pkgkey: string) {
  return API_ZIP_PATTERN.replace('{pkgkey}', pkgkey);
}

export function getTgzPath(pkgkey: string) {
  return API_TGZ_PATTERN.replace('{pkgkey}', pkgkey);
}
