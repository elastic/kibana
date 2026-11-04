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
import { DISCOVER_AD_ANOMALIES_ACTION, type DiscoverADAnomaliesContext } from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';
import { checkPermissionAsync } from '../application/capabilities/check_capabilities';
import { HttpService } from '../application/services/http_service';

export function createDiscoverADAnomaliesAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<DiscoverADAnomaliesContext> {
  return {
    id: 'discover-ad-anomalies-action',
    type: DISCOVER_AD_ANOMALIES_ACTION,
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.discoverADAnomalies', {
        defaultMessage: 'Show anomalies on the Discover chart',
      }),
    async execute(context: ActionExecutionContext<DiscoverADAnomaliesContext>) {
      const { indexPattern, timeRange, chartWidth, signal, onAnomalyRanges } = context;

      const [[coreStart], { mlApiProvider }, { loadAnomalyRanges }, { getSelectedJobId$ }] =
        await Promise.all([
          getStartServices(),
          import('../application/services/ml_api_service'),
          import('./load_anomaly_ranges'),
          import('../application/components/job_suggestion/selected_job'),
        ]);

      const mlApi = mlApiProvider(new HttpService(coreStart.http));

      // The anomalies of the selected job are provided, and again each time another job, or none, is selected,
      // until the result is no longer needed
      let latestLoad = 0;
      const provideAnomalyRanges = async (jobId: string | undefined) => {
        const load = ++latestLoad;
        const ranges = jobId
          ? await loadAnomalyRanges({ mlApi, jobId, timeRange, chartWidth })
          : [];
        if (load === latestLoad && !signal?.aborted) {
          onAnomalyRanges(ranges);
        }
      };

      await new Promise<void>((resolve) => {
        const subscription = getSelectedJobId$(indexPattern).subscribe((jobId) => {
          provideAnomalyRanges(jobId).catch(() => {});
        });
        const stop = () => {
          subscription.unsubscribe();
          resolve();
        };
        if (signal?.aborted) {
          stop();
        } else {
          signal?.addEventListener('abort', stop, { once: true });
        }
      });
    },
    async isCompatible({ indexPattern }: DiscoverADAnomaliesContext) {
      if (!indexPattern) return false;
      return checkPermissionAsync(getStartServices, 'canGetJobs');
    },
  };
}
