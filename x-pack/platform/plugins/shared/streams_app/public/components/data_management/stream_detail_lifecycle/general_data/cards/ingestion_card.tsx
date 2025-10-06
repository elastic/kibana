/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';

export const IngestionCard = ({
  definition,
  stats,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  statsError?: Error;
}) => {
  const title = (
    <EuiToolTip
      title={i18n.translate('xpack.streams.ingestionCard.tooltipTitle', {
        defaultMessage: 'How we calculate ingestion averages',
      })}
      content={i18n.translate('xpack.streams.ingestionCard.tooltip', {
        defaultMessage:
          'Approximate average (stream total size divided by the number of days since creation)',
      })}
    >
      <FormattedMessage
        id="xpack.streams.streamDetailLifecycle.ingestion.title"
        defaultMessage="Ingestion averages {tooltipIcon}"
        values={{
          tooltipIcon: <EuiIcon type="question" />,
        }}
      />
    </EuiToolTip>
  );

  const metrics = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={definition.privileges.monitor}
          title={i18n.translate(
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.dailyIngestionRateLabel',
            { defaultMessage: 'Daily ingestion rate' }
          )}
        >
          {statsError ? '-' : stats?.bytesPerDay ? formatBytes(stats.bytesPerDay || 0) : '-'}
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
          hasPrivileges={definition.privileges.monitor}
          title={i18n.translate(
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.monthlyIngestionRateLabel',
            { defaultMessage: 'Monthly ingestion rate' }
          )}
        >
          {statsError ? '-' : stats?.bytesPerDay ? formatBytes((stats.bytesPerDay || 0) * 30) : '-'}
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

  return <BaseMetricCard title={title} metrics={metrics} />;
};
