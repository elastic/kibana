/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
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
  const title = i18n.translate('xpack.streams.streamDetailLifecycle.ingestion.title', {
    defaultMessage: 'Ingestion averages',
  });

  const metrics = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={definition.privileges.monitor}
          title="ingestionRate"
        >
          {statsError ? '-' : stats?.bytesPerDay ? formatBytes(stats.bytesPerDay || 0) : '-'}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.dailyAverage',
        {
          defaultMessage: 'Daily Average',
        }
      ),
      'data-test-subj': 'ingestion-daily',
    },
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={definition.privileges.monitor}
          title="ingestionRate"
        >
          {statsError ? '-' : stats?.bytesPerDay ? formatBytes((stats.bytesPerDay || 0) * 30) : '-'}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.monthlyAverage',
        {
          defaultMessage: 'Monthly Average',
        }
      ),
      'data-test-subj': 'ingestion-monthly',
    },
  ];

  return <BaseMetricCard title={title} metrics={metrics} grow />;
};
