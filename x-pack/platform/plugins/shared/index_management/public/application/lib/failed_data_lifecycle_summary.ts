/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isRecord } from '../../../common/lib';
import type { FailureStoreClusterSettings } from '../services/api';
import { getRetentionPeriod } from './data_streams';
import { buildFailureStoreRetentionSummary } from './failure_store_retention_summary';

export interface FailedDataLifecycleSummary {
  detailsText: string;
  defaultRetentionTooltip?: string;
}

export const getFailedDataLifecycleSummary = ({
  templateType,
  failureStore,
  failureStoreSettings,
  showPhaseCounts,
}: {
  templateType: 'template' | 'component_template';
  failureStore: unknown;
  failureStoreSettings?: FailureStoreClusterSettings;
  showPhaseCounts: boolean;
}): FailedDataLifecycleSummary | undefined => {
  if (!isRecord(failureStore) || typeof failureStore.enabled !== 'boolean') {
    return undefined;
  }

  const lifecycleRaw: unknown = failureStore.lifecycle;
  const failureStoreLifecycle = isRecord(lifecycleRaw) ? lifecycleRaw : undefined;

  const disabledLabel = i18n.translate(
    'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleDisabled',
    { defaultMessage: 'Disabled' }
  );
  const infiniteLabel = i18n.translate(
    'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleRetentionInfinite',
    { defaultMessage: '∞' }
  );
  const defaultLabel = i18n.translate(
    'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleRetentionDefault',
    { defaultMessage: 'Default' }
  );

  if (failureStore.enabled === false) {
    return { detailsText: disabledLabel };
  }

  const lifecycleEnabledRaw: unknown = failureStoreLifecycle?.enabled;
  const retentionRaw: unknown = failureStoreLifecycle?.data_retention;

  const explicitRetention = typeof retentionRaw === 'string' ? retentionRaw : undefined;
  const defaultRetention =
    typeof failureStoreSettings?.defaultRetentionPeriod === 'string'
      ? failureStoreSettings.defaultRetentionPeriod
      : undefined;

  const retention = explicitRetention ?? defaultRetention;
  const retentionDisabled = lifecycleEnabledRaw === false;
  const isUsingDefaultRetention = explicitRetention == null && retentionDisabled !== true;

  const templateTypeLabel =
    templateType === 'component_template'
      ? i18n.translate(
          'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleDefaultRetentionTooltipTemplateTypeComponent',
          { defaultMessage: 'component template' }
        )
      : i18n.translate(
          'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleDefaultRetentionTooltipTemplateType',
          { defaultMessage: 'template' }
        );

  const defaultRetentionTooltip = (() => {
    if (!isUsingDefaultRetention) return undefined;

    const retentionLabel = defaultRetention != null ? getRetentionPeriod(defaultRetention) : '';
    const hasRetention = defaultRetention != null ? 'true' : 'false';

    return i18n.translate(
      'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleDefaultRetentionTooltip',
      {
        defaultMessage:
          'This {templateType} does not configure an explicit failed data retention. It applies the cluster default failed data retention{hasRetention, select, true { of {retention}} other {}}.',
        values: { templateType: templateTypeLabel, hasRetention, retention: retentionLabel },
      }
    );
  })();

  return {
    detailsText: buildFailureStoreRetentionSummary(
      {
        enabled: true,
        retention,
        retentionDisabled,
      },
      'index_template',
      {
        disabledLabel,
        infiniteLabel,
        defaultLabel,
      },
      { showPhaseCounts }
    ),
    defaultRetentionTooltip,
  };
};
