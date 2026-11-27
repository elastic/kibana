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
import { DISCOVER_AD_ANOMALY_ACTION, type DiscoverADAnomalyContext } from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { hasLicenseAndConnector } from './has_license_and_connector';

export function createDiscoverADAnomalyAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<DiscoverADAnomalyContext> {
  return {
    id: 'discover-ad-anomaly-action',
    type: DISCOVER_AD_ANOMALY_ACTION,
    getIconType(): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.discoverADAnomaly', {
        defaultMessage: 'Show an anomaly from the Discover chart',
      }),
    async execute(context: ActionExecutionContext<DiscoverADAnomalyContext>) {
      const [{ showDiscoverADAnomalyFlyout }, [coreStart, pluginsStart]] = await Promise.all([
        import('../embeddables/job_creation/discover_ad_anomaly'),
        getStartServices(),
      ]);

      await showDiscoverADAnomalyFlyout(
        coreStart,
        pluginsStart.share,
        pluginsStart.data,
        pluginsStart.dashboard,
        pluginsStart,
        context,
        await hasLicenseAndConnector(getStartServices)
      );
    },
    async isCompatible({ jobId }: DiscoverADAnomalyContext) {
      if (!jobId) return false;
      return checkPermissionAsync(getStartServices, 'canGetJobs');
    },
  };
}
