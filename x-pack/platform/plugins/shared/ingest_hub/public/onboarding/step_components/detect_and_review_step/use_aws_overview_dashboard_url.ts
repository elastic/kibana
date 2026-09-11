/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';

/**
 * Canonical saved-object ID of the `[Metrics AWS] Overview` dashboard shipped with
 * the `aws` integration package (elastic/integrations). Stable across renames.
 *
 * Source: packages/aws/kibana/dashboard/aws-fac28650-7349-11e9-816b-07687310a99a.json
 */
const AWS_METRICS_OVERVIEW_DASHBOARD_ID = 'aws-fac28650-7349-11e9-816b-07687310a99a';

/**
 * Resolves the basePath-prefixed href to the `[Metrics AWS] Overview` dashboard using
 * the installed kibana asset references, matching by dashboard ID rather than title.
 *
 * In the default space the asset `id` equals the package ID directly. In non-default
 * spaces Fleet re-keys the saved object and sets `originId` to the original package ID
 * — this follows Fleet's `getDashboardIdForSpace` pattern (fleet/services/dashboard_helpers.ts).
 *
 * Returns `undefined` if the dashboard is not installed.
 */
export function useAwsOverviewDashboardUrl(
  installedKibana: KibanaAssetReference[]
): string | undefined {
  const { services } = useKibana<CoreStart>();

  const overviewRef = installedKibana.find(
    // KibanaSavedObjectType.dashboard === 'dashboard' — literal avoids runtime enum import.
    (k) => k.type === 'dashboard' && (k.originId ?? k.id) === AWS_METRICS_OVERVIEW_DASHBOARD_ID
  );

  return overviewRef
    ? services.http.basePath.prepend(`/app/dashboards#/view/${overviewRef.id}`)
    : undefined;
}
