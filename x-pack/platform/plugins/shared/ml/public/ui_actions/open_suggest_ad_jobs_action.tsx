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
import { SUGGEST_AD_JOBS_ACTION, type SuggestADJobsContext } from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { hasLicenseAndConnector } from './has_license_and_connector';

export function createSuggestADJobsAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<SuggestADJobsContext> {
  return {
    id: 'suggest-ad-jobs-action',
    type: SUGGEST_AD_JOBS_ACTION,
    getIconType(): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.suggestADJobs', {
        defaultMessage: 'Suggest anomaly detection jobs',
      }),
    async execute(context: ActionExecutionContext<SuggestADJobsContext>) {
      try {
        const [{ showSuggestADJobsFlyout }, [coreStart, { share, data, dashboard, cps }]] =
          await Promise.all([
            import('../embeddables/job_creation/suggest_ad_jobs'),
            getStartServices(),
          ]);

        await showSuggestADJobsFlyout(coreStart, share, data, dashboard, cps, context);
      } catch (e) {
        return Promise.reject(e);
      }
    },
    async isCompatible({ indexPattern }: SuggestADJobsContext) {
      if (!indexPattern) return false;
      const canCreateJob = await checkPermissionAsync(getStartServices, 'canCreateJob');
      return canCreateJob && hasLicenseAndConnector(getStartServices);
    },
  };
}
