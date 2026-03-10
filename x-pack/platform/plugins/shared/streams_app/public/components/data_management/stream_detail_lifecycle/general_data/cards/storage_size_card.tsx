/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip, EuiLoadingSpinner, EuiText, formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';

export const StorageSizeCard = ({
  hasMonitorPrivileges,
  stats,
  statsError,
  isTimeSeriesMode = false,
  timeSeriesCountLoading = false,
  timeSeriesCountError,
}: {
  hasMonitorPrivileges: boolean;
  stats?: DataStreamStats;
  statsError?: Error;
  isTimeSeriesMode?: boolean;
  timeSeriesCountLoading?: boolean;
  timeSeriesCountError?: Error;
}) => {
  const totalDocs =
    statsError || !stats || stats.totalDocs === undefined
      ? '-'
      : formatNumber(stats.totalDocs, '0,0');
  const docsText = i18n.translate('xpack.streams.streamDetailLifecycle.storageSize.docs', {
    defaultMessage: '{totalDocs} documents',
    values: { totalDocs },
  });

  const timeSeriesCount =
    statsError || !stats || stats.timeSeriesCount === undefined
      ? '-'
      : formatNumber(stats.timeSeriesCount, '0,0');

  let subtitle: React.ReactNode | null = null;

  if (hasMonitorPrivileges) {
    if (!isTimeSeriesMode) {
      subtitle = docsText;
    } else if (typeof stats?.timeSeriesCount === 'number') {
      subtitle = i18n.translate(
        'xpack.streams.streamDetailLifecycle.storageSize.docsAndTimeSeries',
        {
          defaultMessage: '{totalDocs} documents · {timeSeriesCount} time series',
          values: {
            totalDocs,
            timeSeriesCount,
          },
        }
      );
    } else if (timeSeriesCountLoading) {
      subtitle = (
        <span>
          {docsText} · <EuiLoadingSpinner size="s" />{' '}
          {i18n.translate(
            'xpack.streams.streamDetailLifecycle.storageSize.timeSeriesCountLoading',
            {
              defaultMessage: 'Loading time series count',
            }
          )}
        </span>
      );
    } else if (timeSeriesCountError) {
      subtitle = (
        <span>
          {docsText} ·{' '}
          <EuiText color="warning" size="s" style={{ display: 'inline' }}>
            {i18n.translate(
              'xpack.streams.streamDetailLifecycle.storageSize.timeSeriesCountUnavailable',
              { defaultMessage: 'Failed to fetch time series count' }
            )}
          </EuiText>
        </span>
      );
    }
  }

  const metric = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasMonitorPrivileges}
          title={i18n.translate(
            'xpack.streams.storageSizeCard.privilegesWarningIconWrapper.storagesizeLabel',
            { defaultMessage: 'storageSize' }
          )}
        >
          {statsError || !stats || stats.sizeBytes === undefined
            ? '-'
            : formatBytes(stats.sizeBytes)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle,
      'data-test-subj': 'storageSize',
    },
  ];

  const inaccurateMetric = Boolean(
    stats?.hasFailureStore && !stats.userPrivileges.canManageFailureStore
  );
  const title = (
    <FormattedMessage
      id="xpack.streams.streamDetailLifecycle.storageSize.title"
      defaultMessage="Storage size {tooltipIcon}"
      data-test-subj="storageSize-title"
      values={{
        tooltipIcon: inaccurateMetric && (
          <EuiIconTip
            type="question"
            content={i18n.translate('xpack.streams.streamDetailLifecycle.storageSize.tooltip', {
              defaultMessage: 'The storage size includes the failure store.',
            })}
            data-test-subj="inaccurateMetricTooltip"
          />
        ),
      }}
    />
  );

  return <BaseMetricCard title={title} metrics={metric} data-test-subj="storageSize" />;
};
