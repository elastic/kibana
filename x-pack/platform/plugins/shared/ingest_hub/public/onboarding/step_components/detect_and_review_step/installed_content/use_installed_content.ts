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
  type SimpleSOAssetType,
  type EsAssetReference,
} from '@kbn/fleet-plugin/common';

interface InstalledAsset {
  id: string;
  title: string;
  appLink?: string;
}

export interface InstalledContentData {
  dashboards: InstalledAsset[];
  detectionRules: InstalledAsset[];
  esAssets: EsAssetReference[];
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

  const kibanaAssetIds = useMemo(
    () =>
      installedKibana
        .filter((a) => a.type === 'dashboard' || a.type === 'security-rule')
        .map((a) => ({ id: a.id, type: a.type })),
    [installedKibana]
  );

  const { data, isLoading } = useQuery<GetBulkAssetsResponse>({
    queryKey: ['ingest_hub', 'bulk_assets', kibanaAssetIds.map((a) => a.id).join(',')],
    queryFn: () =>
      services.http.post<GetBulkAssetsResponse>(epmRouteService.getBulkAssetsPath(), {
        body: JSON.stringify({ assetIds: kibanaAssetIds }),
      }),
    enabled: kibanaAssetIds.length > 0,
    staleTime: Infinity,
  });

  const { dashboards, detectionRules } = useMemo(() => {
    const items: Array<SimpleSOAssetType & { appLink?: string }> = data?.items ?? [];
    return {
      dashboards: items
        .filter((a) => a.type === 'dashboard')
        .map((a) => ({ id: a.id, title: a.attributes.title ?? a.id, appLink: a.appLink })),
      detectionRules: items
        .filter((a) => a.type === 'security-rule')
        .map((a) => ({ id: a.id, title: a.attributes.title ?? a.id, appLink: a.appLink })),
    };
  }, [data]);

  return { dashboards, detectionRules, esAssets: installedEs, isLoading };
}
