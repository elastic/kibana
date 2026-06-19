/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaClient } from './kibana_client';

interface DashboardInfo {
  id: string;
  title: string;
}

interface PackageDashboards {
  package: string;
  version: string;
  dashboards: DashboardInfo[];
}

interface PackageInfo {
  name: string;
  version: string;
  dataStreams: Array<{ dataset: string; type: string }>;
  dashboards: DashboardInfo[];
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pLimit = (concurrency: number) => {
  const queue: Array<() => void> = [];
  let active = 0;

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    while (active >= concurrency) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };

  return run;
};

export const createFleetClient = (kibana: KibanaClient) => {
  const installPackage = async (name: string, retries = 3): Promise<boolean> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const res = await kibana.post(`/api/fleet/epm/packages/${name}`, { force: true });
      if (res.status >= 200 && res.status < 300) {
        return true;
      }
      const errorMsg = res.body?.message ?? JSON.stringify(res.body).slice(0, 300);
      if (attempt < retries) {
        console.warn(
          `  [${name}] Install attempt ${attempt} failed (HTTP ${res.status}): ${errorMsg}`
        );
        console.warn(`  Retrying in 10s...`);
        await delay(10000);
      } else {
        console.error(
          `  [${name}] Install failed after ${retries} attempts (HTTP ${res.status}): ${errorMsg}`
        );
      }
    }
    return false;
  };

  const getPackageInfo = async (name: string): Promise<PackageInfo | null> => {
    const res = await kibana.get(`/api/fleet/epm/packages/${name}`);
    if (res.status !== 200) {
      console.warn(`  [${name}] Failed to get package info (${res.status})`);
      return null;
    }

    const item = res.body?.item;
    const version: string = item?.version ?? '';
    const dataStreams: Array<{ dataset: string; type: string }> = (item?.data_streams ?? []).map(
      (ds: any) => ({
        dataset: ds.dataset as string,
        type: ds.type as string,
      })
    );

    const installedKibana: Array<{ id: string; type: string }> =
      item?.installationInfo?.installed_kibana ?? [];

    const dashboardAssets = installedKibana.filter((a) => a.type === 'dashboard');
    let dashboards: DashboardInfo[];

    if (dashboardAssets.length === 0) {
      dashboards = [];
    } else {
      const bulkRes = await kibana.post('/api/fleet/epm/bulk_assets', {
        assetIds: dashboardAssets.map((a) => ({ id: a.id, type: a.type })),
      });

      if (bulkRes.status !== 200) {
        dashboards = dashboardAssets.map((a) => ({ id: a.id, title: a.id }));
      } else {
        dashboards = (bulkRes.body?.items ?? []).map((bi: any) => ({
          id: bi.id,
          title: bi.attributes?.title ?? bi.id,
        }));
      }
    }

    return { name, version, dataStreams, dashboards };
  };

  const installAllPackages = async (
    packageNames: string[],
    concurrency = 5
  ): Promise<PackageDashboards[]> => {
    const limit = pLimit(concurrency);
    const results: PackageDashboards[] = [];
    let completed = 0;

    await Promise.all(
      packageNames.map((name) =>
        limit(async () => {
          const installed = await installPackage(name);
          completed++;

          const info = await getPackageInfo(name);
          const dashboards = info?.dashboards ?? [];
          const version = info?.version ?? 'unknown';
          const status = installed ? 'installed' : 'install failed, using existing';

          console.log(
            `[${completed}/${packageNames.length}] ${name}@${version} (${status}) - ${dashboards.length} dashboard(s)`
          );
          if (dashboards.length > 0) {
            results.push({ package: name, version, dashboards });
          }
        })
      )
    );

    return results.sort((a, b) => a.package.localeCompare(b.package));
  };

  const getAvailablePackages = async (): Promise<Array<{ name: string; version: string }>> => {
    const res = await kibana.get('/api/fleet/epm/packages');
    if (res.status !== 200) {
      throw new Error(`Failed to list packages: ${res.status} ${JSON.stringify(res.body)}`);
    }

    return (res.body?.items ?? [])
      .map((pkg: any) => ({ name: pkg.name as string, version: pkg.version as string }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
  };

  const getInstalledPackageDashboards = async (): Promise<PackageDashboards[]> => {
    const res = await kibana.get('/api/fleet/epm/packages/installed');
    if (res.status !== 200) {
      throw new Error(
        `Failed to list installed packages: ${res.status} ${JSON.stringify(res.body)}`
      );
    }

    const installedPackages = (res.body?.items ?? []).map((pkg: any) => ({
      name: pkg.name as string,
      version: pkg.version as string,
    }));

    const results: PackageDashboards[] = [];

    for (const { name, version } of installedPackages) {
      const info = await getPackageInfo(name);
      const dashboards = info?.dashboards ?? [];
      if (dashboards.length > 0) {
        results.push({ package: name, version, dashboards });
      }
    }

    return results.sort((a, b) => a.package.localeCompare(b.package));
  };

  const extractFilterValues = (query: any, target: Record<string, Set<string>>) => {
    if (!query || typeof query !== 'object') return;

    if (query.match_phrase) {
      for (const [field, val] of Object.entries(query.match_phrase)) {
        if (field.startsWith('data_stream.')) continue;
        const strVal =
          typeof val === 'object' && val !== null ? String((val as any).query ?? val) : String(val);
        if (!target[field]) target[field] = new Set();
        target[field].add(strVal);
      }
    }

    if (query.match) {
      for (const [field, val] of Object.entries(query.match)) {
        if (field.startsWith('data_stream.')) continue;
        const strVal =
          typeof val === 'object' && val !== null ? String((val as any).query ?? val) : String(val);
        if (!target[field]) target[field] = new Set();
        target[field].add(strVal);
      }
    }

    if (query.bool?.should) {
      for (const clause of query.bool.should) {
        extractFilterValues(clause, target);
      }
    }
  };

  const getDashboardFilterOverrides = async (
    dashboardIds: string[]
  ): Promise<Record<string, Record<string, string[]>>> => {
    const perDataset: Record<string, Record<string, Set<string>>> = {};

    const addToDataset = (dataset: string, collected: Record<string, Set<string>>) => {
      if (!perDataset[dataset]) perDataset[dataset] = {};
      for (const [field, values] of Object.entries(collected)) {
        if (!perDataset[dataset][field]) perDataset[dataset][field] = new Set();
        for (const v of values) perDataset[dataset][field].add(v);
      }
    };

    for (const id of dashboardIds) {
      const res = await kibana.get(`/api/saved_objects/dashboard/${id}`);
      if (res.status !== 200) continue;

      const attrs = res.body?.attributes ?? {};

      let searchSource: any = {};
      try {
        searchSource = JSON.parse(attrs.kibanaSavedObjectMeta?.searchSourceJSON ?? '{}');
      } catch {
        continue;
      }

      let dataset = '*';
      const collected: Record<string, Set<string>> = {};

      for (const f of searchSource.filter ?? []) {
        if (f.meta?.disabled) continue;
        const q = f.query ?? {};
        if (q.match_phrase?.['data_stream.dataset']) {
          dataset = String(q.match_phrase['data_stream.dataset']);
        }
        extractFilterValues(q, collected);
      }

      const panels: any[] = JSON.parse(attrs.panelsJSON ?? '[]');
      for (const p of panels) {
        const state = p.embeddableConfig?.attributes?.state ?? {};
        for (const f of state.filters ?? []) {
          if (f.meta?.disabled) continue;
          extractFilterValues(f.query ?? {}, collected);
        }
      }

      addToDataset(dataset, collected);
    }

    const result: Record<string, Record<string, string[]>> = {};
    for (const [dataset, fields] of Object.entries(perDataset)) {
      result[dataset] = {};
      for (const [field, values] of Object.entries(fields)) {
        result[dataset][field] = [...values];
      }
    }
    return result;
  };

  return {
    installPackage,
    getPackageInfo,
    installAllPackages,
    getAvailablePackages,
    getInstalledPackageDashboards,
    getDashboardFilterOverrides,
  };
};

export type { PackageDashboards, DashboardInfo, PackageInfo };
