/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'async_hooks';

import LRUCache from 'lru-cache';

import type { AssetsMap, PackagePolicyAssetsMap } from '../../../../common/types';

import type { PackageInfo } from '../../../../common';

const cacheStore = new AsyncLocalStorage<CacheSession>();

const PACKAGE_INFO_CACHE_SIZE = 20;
const PACKAGE_ASSETS_MAP_CACHE_SIZE = 1;
const AGENT_TEMPLATE_ASSETS_MAP_CACHE_SIZE = 5;

class CacheSession {
  private _packageInfoCache?: LRUCache<string, PackageInfo>;

  private _packageAssetsMap?: LRUCache<string, AssetsMap>;

  private _agentTemplateAssetsMap?: LRUCache<string, PackagePolicyAssetsMap>;

  getPackageInfoCache() {
    if (!this._packageInfoCache) {
      this._packageInfoCache = new LRUCache<string, PackageInfo>({
        max: PACKAGE_INFO_CACHE_SIZE,
      });
    }
    return this._packageInfoCache;
  }

  getPackageAssetsMapCache() {
    if (!this._packageAssetsMap) {
      this._packageAssetsMap = new LRUCache<string, AssetsMap>({
        max: PACKAGE_ASSETS_MAP_CACHE_SIZE,
      });
    }
    return this._packageAssetsMap;
  }

  getAgentTemplateAssetsMapCache() {
    if (!this._agentTemplateAssetsMap) {
      this._agentTemplateAssetsMap = new LRUCache<string, PackagePolicyAssetsMap>({
        max: AGENT_TEMPLATE_ASSETS_MAP_CACHE_SIZE,
      });
    }
    return this._agentTemplateAssetsMap;
  }
}

export function getPackageInfoCache(pkgName: string, pkgVersion: string) {
  return cacheStore.getStore()?.getPackageInfoCache()?.get(`${pkgName}:${pkgVersion}`);
}

export function setPackageInfoCache(pkgName: string, pkgVersion: string, packageInfo: PackageInfo) {
  return cacheStore.getStore()?.getPackageInfoCache()?.set(`${pkgName}:${pkgVersion}`, packageInfo);
}

export function getPackageAssetsMapCache(pkgName: string, pkgVersion: string) {
  return cacheStore.getStore()?.getPackageAssetsMapCache()?.get(`${pkgName}:${pkgVersion}`);
}

export function setPackageAssetsMapCache(
  pkgName: string,
  pkgVersion: string,
  assetsMap: AssetsMap
) {
  return cacheStore
    .getStore()
    ?.getPackageAssetsMapCache()
    ?.set(`${pkgName}:${pkgVersion}`, assetsMap);
}

export function getAgentTemplateAssetsMapCache(pkgName: string, pkgVersion: string) {
  return cacheStore.getStore()?.getAgentTemplateAssetsMapCache()?.get(`${pkgName}:${pkgVersion}`);
}

export function setAgentTemplateAssetsMapCache(
  pkgName: string,
  pkgVersion: string,
  assetsMap: PackagePolicyAssetsMap
) {
  return cacheStore
    .getStore()
    ?.getAgentTemplateAssetsMapCache()
    ?.set(`${pkgName}:${pkgVersion}`, assetsMap);
}

export async function runWithCache<T = any>(cb: () => Promise<T>): Promise<T> {
  const cache = new CacheSession();

  return cacheStore.run(cache, cb);
}
