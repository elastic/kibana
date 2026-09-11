/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  epmRouteService,
  type KibanaAssetReference,
  type GetBulkAssetsResponse,
} from '@kbn/fleet-plugin/common';

/** Canonical title of the AWS metrics overview dashboard shipped with the `aws` package. */
const AWS_OVERVIEW_DASHBOARD_TITLE = '[Metrics AWS] Overview';

/**
 * Resolves the basePath-prefixed href to the `[Metrics AWS] Overview` dashboard from the
 * installed kibana assets, or `undefined` when the dashboard is not found.
 *
 * Uses its own query rather than sharing one with `useInstalledContent` so the return type
 * is explicit (`string | undefined`) and not inferred through Fleet's bulk-assets type chain.
 */
export function useAwsOverviewDashboardUrl(
  installedKibana: KibanaAssetReference[]
): string | undefined {
  const { services } = useKibana<CoreStart>();

  // KibanaSavedObjectType.dashboard === 'dashboard' — use literal to avoid runtime enum import.
  const dashboardRefs = installedKibana.filter((k) => k.type === 'dashboard');

  const { data } = useQuery<string | undefined>({
    queryKey: [
      'ingest_hub',
      'aws_overview_dashboard_url',
      dashboardRefs.map((k) => k.id).join(','),
    ],
    queryFn: async (): Promise<string | undefined> => {
      const response = await services.http.post<GetBulkAssetsResponse>(
        epmRouteService.getBulkAssetsPath(),
        {
          body: JSON.stringify({
            assetIds: dashboardRefs.map((k) => ({ id: k.id, type: k.type })),
          }),
        }
      );
      const overview = response?.items?.find(
        (item) => item.attributes?.title === AWS_OVERVIEW_DASHBOARD_TITLE
      );
      return overview?.appLink
        ? services.http.basePath.prepend(overview.appLink)
        : undefined;
    },
    enabled: dashboardRefs.length > 0,
    staleTime: Infinity,
  });

  return data;
}
