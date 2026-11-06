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
import { getInfiniteRetentionLabel } from './infinite_retention_label';

export interface FailedDataLifecycleSummary {
  detailsText: string;
  defaultRetentionTooltip?: string;
  settingsErrorTooltip?: string;
}

export const getFailedDataLifecycleSummary = ({
  templateType,
  failureStore,
  failureStoreSettings,
  hasSettingsError = false,
  showPhaseCounts,
}: {
  templateType: 'template' | 'component_template';
  failureStore: unknown;
  failureStoreSettings?: FailureStoreClusterSettings;
  hasSettingsError?: boolean;
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
  const infiniteLabel = getInfiniteRetentionLabel();

  if (failureStore.enabled === false) {
    return { detailsText: disabledLabel };
  }

  const lifecycleEnabledRaw: unknown = failureStoreLifecycle?.enabled;
  const retentionRaw: unknown = failureStoreLifecycle?.data_retention;

  // Elasticsearch represents an explicitly infinite retention with -1 (as a number or a string).
  const isInfiniteRetentionValue = (value: unknown): boolean => value === -1 || value === '-1';

  const hasExplicitRetention = retentionRaw !== undefined && retentionRaw !== null;
  const explicitInfiniteRetention = isInfiniteRetentionValue(retentionRaw);
  const explicitFiniteRetention =
    typeof retentionRaw === 'string' && retentionRaw.length > 0 && !explicitInfiniteRetention
      ? retentionRaw
      : undefined;

  const defaultRetention =
    typeof failureStoreSettings?.defaultRetentionPeriod === 'string' &&
    failureStoreSettings.defaultRetentionPeriod.length > 0
      ? failureStoreSettings.defaultRetentionPeriod
      : undefined;

  const lifecycleDisabled = lifecycleEnabledRaw === false;
  const wouldFallBackToClusterDefault = !hasExplicitRetention && !lifecycleDisabled;
  if (hasSettingsError && wouldFallBackToClusterDefault) {
    return {
      detailsText: '',
      settingsErrorTooltip: i18n.translate(
        'xpack.idxMgmt.templateDetails.summaryTab.failedDataLifecycleSettingsErrorTooltip',
        { defaultMessage: 'Unable to load the cluster default failed data retention' }
      ),
    };
  }

  const finiteRetention = explicitFiniteRetention ?? defaultRetention;
  const retentionIsInfinite =
    lifecycleDisabled || explicitInfiniteRetention || finiteRetention == null;
  const isUsingDefaultRetention = wouldFallBackToClusterDefault && defaultRetention != null;

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
        retention: retentionIsInfinite ? undefined : finiteRetention,
        retentionDisabled: retentionIsInfinite,
      },
      'index_template',
      {
        disabledLabel,
        infiniteLabel,
      },
      { showPhaseCounts }
    ),
    defaultRetentionTooltip,
  };
};
