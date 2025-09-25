/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { formatNumber } from '@elastic/eui';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';
import { BaseMetricCard } from '../../common/base_metric_card';
import type { FailureStoreStats } from '../../hooks/use_failure_store_stats';
import { formatBytes } from '../../helpers/format_bytes';

export const StorageSizeCard = ({
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
    'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.title',
    {
      defaultMessage: 'Failure storage size',
    }
  );

  const metric = [
    {
      data: (
        <PrivilegesWarningIconWrapper hasPrivileges={hasPrivileges} title="storageSize">
          {statsError || !stats || !stats.size ? '-' : formatBytes(stats.size)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: hasPrivileges
        ? i18n.translate(
            'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.documents',
            {
              defaultMessage: '{docsCount} documents',
              values: {
                docsCount:
                  statsError || !stats || !stats.count ? '-' : formatNumber(stats.count, '0,0'),
              },
            }
          )
        : null,
      'data-test-subj': 'failureStoreStorageSize',
    },
  ];

  return <BaseMetricCard title={title} metrics={metric} />;
};
