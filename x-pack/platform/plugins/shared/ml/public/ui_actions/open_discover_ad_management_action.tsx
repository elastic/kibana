/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ActionExecutionContext,
  UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import {
  DISCOVER_AD_MANAGEMENT_ACTION,
  type DiscoverADManagementContext,
} from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { hasLicenseAndConnector } from './has_license_and_connector';

export function createDiscoverADManagementAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<DiscoverADManagementContext> {
  return {
    id: 'discover-ad-management-action',
    type: DISCOVER_AD_MANAGEMENT_ACTION,
    getIconType(): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.discoverADManagement', {
        defaultMessage: 'Manage anomaly detection from Discover',
      }),
    async execute(context: ActionExecutionContext<DiscoverADManagementContext>) {
      try {
        const [{ showDiscoverADManagementFlyout }, [coreStart, { share, data, dashboard, cps }]] =
          await Promise.all([
            import('../embeddables/job_creation/discover_ad_management'),
            getStartServices(),
          ]);

        await showDiscoverADManagementFlyout(coreStart, share, data, dashboard, cps, context);
      } catch (e) {
        return Promise.reject(e);
      }
    },
    async isCompatible({ indexPattern }: DiscoverADManagementContext) {
      if (!indexPattern) return false;
      const canCreateJob = await checkPermissionAsync(getStartServices, 'canCreateJob');
      return canCreateJob && hasLicenseAndConnector(getStartServices);
    },
  };
}
