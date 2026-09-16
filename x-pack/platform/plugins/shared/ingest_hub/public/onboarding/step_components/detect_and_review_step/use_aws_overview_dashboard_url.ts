/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { KibanaAssetReference } from '@kbn/fleet-plugin/common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/**
 * Canonical saved-object ID of the `[Metrics AWS] Overview` dashboard shipped with
 * the `aws` integration package (elastic/integrations). Stable across renames.
 *
 * Source: https://github.com/elastic/integrations/blob/main/packages/aws/kibana/dashboard/aws-fac28650-7349-11e9-816b-07687310a99a.json
 */
const AWS_METRICS_OVERVIEW_DASHBOARD_ID = 'aws-fac28650-7349-11e9-816b-07687310a99a';

/**
 * Minimal slice of Fleet's InstallationInfo needed for space-aware dashboard resolution.
 * InstallationInfo is not exported from @kbn/fleet-plugin/common so we define the subset.
 */
export interface InstallationSnapshot {
  installed_kibana: KibanaAssetReference[];
  /** The space where the package's Kibana assets were originally installed. */
  installed_kibana_space_id?: string;
  /** Space-local asset refs for any spaces beyond the primary installation space. */
  additional_spaces_installed_kibana?: Record<string, KibanaAssetReference[]>;
}

/**
 * Resolves the basePath-prefixed href to the `[Metrics AWS] Overview` dashboard,
 * matched by dashboard ID (not title) following Fleet's `getDashboardIdForSpace` pattern
 * (x-pack/platform/plugins/shared/fleet/public/.../dashboard_helpers.ts):
 *
 * - Primary space (`installed_kibana_space_id === currentSpaceId`): the canonical package
 *   ID is the saved-object ID directly — look in `installed_kibana`.
 * - Any other space: Fleet re-keys saved objects; look in `additional_spaces_installed_kibana`
 *   for a ref where `originId === canonicalId` and use that ref's space-local `id`.
 *
 * Returns `undefined` while the current space is still resolving, or if the dashboard is
 * not installed in the current space.
 */
export function useAwsOverviewDashboardUrl(
  installationInfo: InstallationSnapshot | undefined
): string | undefined {
  const { services } = useKibana<CoreStart & { spaces?: SpacesPluginStart }>();

  // Resolve the current space ID. When the spaces service is present we cannot know
  // the active space synchronously, so start undefined and emit no href until it
  // resolves — otherwise, in a non-default space, we would build a primary-space
  // dashboard id that does not exist there (a broken link). Without the spaces
  // service, fall back to the primary space.
  const [currentSpaceId, setCurrentSpaceId] = useState<string | undefined>(
    services.spaces ? undefined : 'default'
  );
  useEffect(() => {
    if (!services.spaces) return;
    services.spaces.getActiveSpace().then((space) => setCurrentSpaceId(space.id));
  }, [services.spaces]);

  if (!installationInfo || currentSpaceId === undefined) return undefined;

  const { installed_kibana, installed_kibana_space_id, additional_spaces_installed_kibana } =
    installationInfo;

  let dashboardId: string | undefined;

  if (!installed_kibana_space_id || installed_kibana_space_id === currentSpaceId) {
    // Primary space: the canonical package ID is the saved-object id directly.
    // KibanaSavedObjectType.dashboard === 'dashboard' — literal avoids runtime enum import.
    const ref = installed_kibana.find(
      (k) => k.type === 'dashboard' && k.id === AWS_METRICS_OVERVIEW_DASHBOARD_ID
    );
    dashboardId = ref?.id;
  } else {
    // Non-primary space: Fleet re-keys the saved object; match by originId.
    const spaceRefs = additional_spaces_installed_kibana?.[currentSpaceId];
    const ref = spaceRefs?.find(
      (k) => k.type === 'dashboard' && k.originId === AWS_METRICS_OVERVIEW_DASHBOARD_ID
    );
    dashboardId = ref?.id;
  }

  return dashboardId
    ? services.http.basePath.prepend(`/app/dashboards#/view/${dashboardId}`)
    : undefined;
}
