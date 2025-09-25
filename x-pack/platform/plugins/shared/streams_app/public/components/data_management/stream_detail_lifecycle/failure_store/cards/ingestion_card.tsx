/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { FailureStoreStats } from '../../hooks/use_failure_store_stats';

export const IngestionCard = ({
  definition,
  stats,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: FailureStoreStats;
  statsError?: Error;
}) => {
  const hasPrivileges = definition.privileges?.manage_failure_store;

  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.title',
    {
      defaultMessage: 'Failed ingestion averages',
    }
  );

  const metrics = [
    {
      data: (
        <PrivilegesWarningIconWrapper hasPrivileges={hasPrivileges} title="storageSize">
          {statsError || !stats || !stats.bytesPerDay ? '-' : formatBytes(stats.bytesPerDay)}
        </PrivilegesWarningIconWrapper>
      ),

      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.dailyAverage',
        {
          defaultMessage: 'Daily Average',
        }
      ),
      'data-test-subj': 'failureStoreIngestionDaily',
    },
    {
      data: (
        <PrivilegesWarningIconWrapper hasPrivileges={hasPrivileges} title="storageSize">
          {statsError || !stats || !stats.bytesPerDay ? '-' : formatBytes(stats.bytesPerDay * 30)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.monthlyAverage',
        {
          defaultMessage: 'Monthly Average',
        }
      ),
      'data-test-subj': 'failureStoreIngestionMonthly',
    },
  ];

  return <BaseMetricCard title={title} metrics={metrics} />;
};
