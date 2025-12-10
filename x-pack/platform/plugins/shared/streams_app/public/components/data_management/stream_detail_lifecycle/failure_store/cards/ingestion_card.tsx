/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIconTip } from '@elastic/eui';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';

export const IngestionCard = ({
  hasPrivileges,
  stats,
  statsError,
}: {
  hasPrivileges: boolean;
  stats?: EnhancedFailureStoreStats;
  statsError?: Error;
}) => {
  const title = (
    <FormattedMessage
      id="xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.title"
      defaultMessage="Failed ingestion averages {tooltipIcon}"
      values={{
        tooltipIcon: (
          <EuiIconTip
            type="question"
            title={i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.tooltipTitle',
              {
                defaultMessage: 'How we calculate failed ingestion averages',
              }
            )}
            content={i18n.translate(
              'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.tooltip',
              {
                defaultMessage:
                  'Approximate average, calculated by extrapolating the ingestion rate from the failed documents on the selected time range and the average document size.',
              }
            )}
          />
        ),
      }}
    />
  );

  const metrics = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasPrivileges}
          title={i18n.translate(
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.ingestiondailyLabel',
            { defaultMessage: 'ingestionDaily' }
          )}
        >
          {statsError || !stats || stats.bytesPerDay === undefined
            ? '-'
            : formatBytes(stats.bytesPerDay)}
        </PrivilegesWarningIconWrapper>
      ),

      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.dailyAverage',
        {
          defaultMessage: 'Daily average',
        }
      ),
      'data-test-subj': 'failureStoreIngestionDaily',
    },
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasPrivileges}
          title={i18n.translate(
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.ingestionmonthlyLabel',
            { defaultMessage: 'ingestionMonthly' }
          )}
        >
          {statsError || !stats || stats.bytesPerDay === undefined
            ? '-'
            : formatBytes(stats.bytesPerDay * 30)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.monthlyAverage',
        {
          defaultMessage: 'Monthly average',
        }
      ),
      'data-test-subj': 'failureStoreIngestionMonthly',
    },
  ];

  return <BaseMetricCard title={title} metrics={metrics} />;
};
