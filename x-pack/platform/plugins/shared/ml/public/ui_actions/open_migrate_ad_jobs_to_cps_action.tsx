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
import { MIGRATE_AD_JOBS_TO_CPS_ACTION, type MigrateADJobsToCpsContext } from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';

export function migrateADJobsToCps(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<MigrateADJobsToCpsContext> {
  return {
    id: 'migrate-ad-jobs-to-cps-action',
    type: MIGRATE_AD_JOBS_TO_CPS_ACTION,
    getIconType(): string {
      return 'machineLearningApp';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.migrateADJobsToCps', {
        defaultMessage: 'Migrate anomaly detection jobs to cross-project search',
      }),
    async execute(context: ActionExecutionContext<MigrateADJobsToCpsContext>) {
      try {
        const [{ showMigrateADJobsToCpsFlyout }, [coreStart, { share, data, dashboard, cps }]] =
          await Promise.all([
            import('../embeddables/job_creation/migrate_ad_jobs_to_cps'),
            getStartServices(),
          ]);

        const { onClose, initialJobIds, allowScopeSelection } = context;
        await showMigrateADJobsToCpsFlyout(
          coreStart,
          share,
          data,
          dashboard,
          cps,
          initialJobIds,
          allowScopeSelection,
          onClose
        );
      } catch (e) {
        return Promise.reject(e);
      }
    },
    async isCompatible() {
      return true;
    },
  };
}
