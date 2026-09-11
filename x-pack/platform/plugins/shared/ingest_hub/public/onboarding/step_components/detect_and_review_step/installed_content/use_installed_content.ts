/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  epmRouteService,
  type GetBulkAssetsResponse,
  type EsAssetReference,
  ElasticsearchAssetType,
  displayedAssetTypes,
  displayedAssetTypesLookup,
} from '@kbn/fleet-plugin/common';
import { AssetTitleMap } from '@kbn/fleet-plugin/public';

export interface InstalledAsset {
  id: string;
  title: string;
  appLink?: string;
}

export interface AssetCategoryData {
  type: string;
  title: string;
  assets: InstalledAsset[];
}

export interface EnrichedEsAsset {
  id: string;
  type: string;
  appLink?: string;
}

export interface InstalledContentData {
  /** Kibana asset categories, ordered by Fleet's `displayedAssetTypes` ordering. */
  categories: AssetCategoryData[];
  /** ES assets enriched with appLink where the server was able to resolve one. */
  esAssets: EnrichedEsAsset[];
  isLoading: boolean;
}

interface UseInstalledContentOptions {
  installedKibana: Array<{ id: string; type: string }>;
  installedEs: EsAssetReference[];
}

export function useInstalledContent({
  installedKibana,
  installedEs,
}: UseInstalledContentOptions): InstalledContentData {
  const { services } = useKibana<CoreStart>();

  // Request all Kibana asset types that Fleet's Assets tab would display, plus all
  // ES asset types. knowledge_base is excluded because it is not a saved object and
  // bulkResolve can't resolve it — Fleet does the same exclusion in its Assets tab.
  const allAssetIds = useMemo(() => {
    const kibana = installedKibana
      .filter(
        (a) =>
          displayedAssetTypesLookup.has(a.type) && a.type !== ElasticsearchAssetType.knowledgeBase
      )
      .map((a) => ({ id: a.id, type: a.type }));

    const es = installedEs
      .filter((a) => a.type !== ElasticsearchAssetType.knowledgeBase)
      .map((a) => ({ id: a.id, type: a.type }));

    return [...kibana, ...es];
  }, [installedKibana, installedEs]);

  const { data, isLoading } = useQuery<GetBulkAssetsResponse>({
    queryKey: ['ingest_hub', 'bulk_assets', allAssetIds.map((a) => a.id).join(',')],
    queryFn: () =>
      services.http.post<GetBulkAssetsResponse>(epmRouteService.getBulkAssetsPath(), {
        body: JSON.stringify({ assetIds: allAssetIds }),
      }),
    enabled: allAssetIds.length > 0,
    staleTime: Infinity,
  });

  const categories = useMemo(() => {
    const items = data?.items ?? [];

    // Group Kibana assets by type (ES types are handled separately below)
    const byType = new Map<string, InstalledAsset[]>();
    for (const asset of items) {
      // Skip ES types — they go into the Required assets section
      if (Object.values(ElasticsearchAssetType).includes(asset.type as ElasticsearchAssetType)) {
        continue;
      }
      const list = byType.get(asset.type) ?? [];
      list.push({
        id: asset.id,
        title: asset.attributes?.title ?? asset.id,
        appLink: asset.appLink || undefined,
      });
      byType.set(asset.type, list);
    }

    // Sort assets within each category by title, then emit categories in
    // displayedAssetTypes order (same as Fleet's Assets tab).
    const result: AssetCategoryData[] = [];
    for (const type of displayedAssetTypes) {
      const assets = byType.get(type);
      if (!assets || assets.length === 0) continue;
      assets.sort((a, b) => a.title.localeCompare(b.title));
      const title = AssetTitleMap[type as keyof typeof AssetTitleMap] ?? type;
      result.push({ type, title, assets });
    }
    return result;
  }, [data]);

  // Enrich ES assets with appLink from the bulk-assets response, then group by
  // type (in displayedAssetTypes order) and sort by id within each group so the
  // Required assets accordion presents a predictable, scannable structure.
  // knowledge_base assets keep no appLink (they weren't in the request).
  const esAssets = useMemo<EnrichedEsAsset[]>(() => {
    const appLinkById = new Map<string, string>();
    for (const item of data?.items ?? []) {
      if (item.appLink) appLinkById.set(item.id, item.appLink);
    }

    const enriched = installedEs.map((a) => ({
      id: a.id,
      type: a.type,
      appLink: appLinkById.get(a.id) || undefined,
    }));

    // Group by type, preserving displayedAssetTypes ordering across groups;
    // types not in displayedAssetTypes (shouldn't happen) go last, sorted by type name.
    const typeOrder = new Map<string, number>(displayedAssetTypes.map((t, i) => [t, i]));
    return enriched.sort((a, b) => {
      const orderA = typeOrder.get(a.type) ?? Infinity;
      const orderB = typeOrder.get(b.type) ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      // Within the same type, sort alphabetically by id
      return a.id.localeCompare(b.id);
    });
  }, [data, installedEs]);

  return { categories, esAssets, isLoading };
}
