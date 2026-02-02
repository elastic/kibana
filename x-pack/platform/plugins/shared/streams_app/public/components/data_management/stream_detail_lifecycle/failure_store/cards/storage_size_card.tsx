/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { formatNumber } from '@elastic/eui';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';

export const StorageSizeCard = ({
  hasPrivileges,
  stats,
  statsError,
}: {
  hasPrivileges: boolean;
  stats?: EnhancedFailureStoreStats;
  statsError?: Error;
}) => {
  const title = i18n.translate(
    'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.title',
    {
      defaultMessage: 'Storage size',
    }
  );

  const metric = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={hasPrivileges}
          title={i18n.translate(
            'xpack.streams.storageSizeCard.privilegesWarningIconWrapper.storagesizeLabel',
            { defaultMessage: 'storageSize' }
          )}
        >
          {statsError || !stats || stats.size === undefined ? '-' : formatBytes(stats.size)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: hasPrivileges
        ? i18n.translate(
            'xpack.streams.streamDetailView.failureStoreEnabled.failureStorageCard.documents',
            {
              defaultMessage: '{docsCount} documents',
              values: {
                docsCount:
                  statsError || !stats || stats.count === undefined
                    ? '-'
                    : formatNumber(stats.count, '0,0'),
              },
            }
          )
        : null,
      'data-test-subj': 'failureStoreStorageSize',
    },
  ];

  return <BaseMetricCard title={title} metrics={metric} data-test-subj="failureStoreStorageSize" />;
};
