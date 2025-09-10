/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { BaseMetricCard } from '../../common/base_metric_card';
import { formatBytes } from '../../helpers/format_bytes';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';
import { PrivilegesWarningIconWrapper } from '../../../../insufficient_privileges/insufficient_privileges';

export const StorageSizeCard = ({
  definition,
  stats,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  statsError?: Error;
}) => {
  const hasPrivileges = definition.privileges?.monitor ?? false;
  const metric = [
    {
      data: (
        <PrivilegesWarningIconWrapper
          hasPrivileges={definition.privileges.monitor}
          title="storageSize"
        >
          {statsError || !stats || !stats.sizeBytes ? '-' : formatBytes(stats.sizeBytes)}
        </PrivilegesWarningIconWrapper>
      ),
      subtitle: hasPrivileges
        ? i18n.translate('xpack.streams.streamDetailLifecycle.storageSize.docs', {
            defaultMessage: '{totalDocs} documents',
            values: {
              totalDocs: stats && stats.totalDocs ? formatNumber(stats.totalDocs, '0,0') : '-',
            },
          })
        : null,
      'data-test-subj': 'storageSize',
    },
  ];

  const title = i18n.translate('xpack.streams.streamDetailLifecycle.storageSize.title', {
    defaultMessage: 'Storage size',
  });

  return <BaseMetricCard title={title} metrics={metric} />;
};
