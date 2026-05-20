/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { BaseMetricCard } from '../../common/base_metric_card';
import { getTimeSizeAndUnitLabel } from '../../../../../../util/format_size_units';
import type { useFailureStoreConfig } from '../../hooks/use_failure_store_config';

export const RetentionCard = ({
  openModal,
  canManageFailureStore,
  failureStoreConfig,
}: {
  openModal: (show: boolean) => void;
  canManageFailureStore: boolean;
  failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
}) => {
  const { failureStoreEnabled, customRetentionPeriod, defaultRetentionPeriod, retentionDisabled } =
    failureStoreConfig;

  if (!failureStoreEnabled) {
    return null;
  }

  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.title',
    {
      defaultMessage: 'Lifecycle summary',
    }
  );

  const failureRetentionPeriod = retentionDisabled
    ? '∞'
    : customRetentionPeriod
    ? getTimeSizeAndUnitLabel(customRetentionPeriod)
    : getTimeSizeAndUnitLabel(defaultRetentionPeriod);

  const phasesCount = retentionDisabled ? 1 : 2;

  const subtitles = [
    i18n.translate('xpack.streams.streamDetailLifecycle.lifecycleSummary.dataPhasesCount', {
      defaultMessage: '{count, plural, one {# data phase} other {# data phases}}',
      values: { count: phasesCount },
    }),
  ];

  const metric = [
    {
      data: failureRetentionPeriod ?? '—',
      subtitle: subtitles,
      'data-test-subj': 'failureStoreRetention',
    },
  ];

  return (
    <BaseMetricCard
      title={title}
      actions={
        canManageFailureStore ? (
          <EuiButton
            data-test-subj="streamFailureStoreEditRetention"
            size="s"
            color="text"
            onClick={() => openModal(true)}
            aria-label={i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.editFailureStoreLifecycleMethodAriaLabel',
              {
                defaultMessage: 'Edit failure store lifecycle method',
              }
            )}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failureRetentionCard.editLifecycleMethodButton',
              {
                defaultMessage: 'Edit lifecycle method',
              }
            )}
          </EuiButton>
        ) : undefined
      }
      metrics={metric}
      data-test-subj="failureStoreRetentionCard"
    />
  );
};
