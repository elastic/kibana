/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';
import type { EnhancedDataStreamStats } from '../../hooks/use_data_stream_stats';

export const IngestionCard = ({
  hasMonitorPrivileges,
  stats,
  statsError,
}: {
  hasMonitorPrivileges: boolean;
  stats?: EnhancedDataStreamStats;
  statsError?: Error;
}) => {
  const inaccurateMetric = Boolean(
    stats?.hasFailureStore && !stats.userPrivileges.canManageFailureStore
  );
  const title = (
    <FormattedMessage
      id="xpack.streams.streamDetailLifecycle.ingestion.title"
      defaultMessage="Ingestion averages {tooltipIcon}"
      values={{
        tooltipIcon: (
          <EuiIconTip
            type="question"
            title={i18n.translate('xpack.streams.ingestionCard.tooltipTitle', {
              defaultMessage: 'How we calculate ingestion averages',
            })}
            content={
              <>
                {i18n.translate('xpack.streams.ingestionCard.tooltip.description', {
                  defaultMessage:
                    'Approximate average, calculated by extrapolating the ingestion rate from the documents on the selected time range and the average document size.',
                })}

                {inaccurateMetric && (
                  <>
                    <EuiSpacer size="xs" />

                    {i18n.translate('xpack.streams.ingestionCard.tooltip.privilegesWarning', {
                      defaultMessage:
                        'These averages may not be accurate because you lack sufficient privileges to access all the data.',
                    })}
                  </>
                )}
              </>
            }
          />
        ),
      }}
    />
  );

  const metrics = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasMonitorPrivileges}
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
      'data-test-subj': 'ingestion-daily',
    },
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasMonitorPrivileges}
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
      'data-test-subj': 'ingestion-monthly',
    },
  ];

  return <BaseMetricCard title={title} metrics={metrics} data-test-subj="ingestionCard" />;
};
