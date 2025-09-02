/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { BaseMetricCard } from '../../common/base_metric_card';
import type { FailureStoreStats } from '../../hooks/use_failure_store_stats';
import { formatBytes } from '../../helpers/format_bytes';

export const StorageSizeCard = ({
  stats,
  statsError,
}: {
  stats?: FailureStoreStats;
  statsError?: Error;
}) => {
  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.title',
    {
      defaultMessage: 'Failure storage size',
    }
  );

  const metric = [
    {
      data: statsError || !stats || !stats.size ? '-' : formatBytes(stats.size),
      subtitle: i18n.translate(
        'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.documents',
        {
          defaultMessage: '{docsCount} documents',
          values: {
            docsCount: statsError || !stats || !stats.count ? '-' : formatBytes(stats.count),
          },
        }
      ),
      'data-test-subj': 'failureStoreStorageSize',
    },
  ];

  return <BaseMetricCard title={title} metrics={metric} />;
};
