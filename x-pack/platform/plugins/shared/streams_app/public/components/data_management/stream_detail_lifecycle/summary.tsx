/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiStat, formatNumber } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { PrivilegesWarningIconWrapper } from '../../insufficient_privileges/insufficient_privileges';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { formatBytes } from './helpers/format_bytes';

const statCss = css`
  min-width: 200px;
`;

export function RetentionSummary({
  definition,
  stats,
  isLoadingStats,
  statsError,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
  statsError?: Error;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiStat
        css={statCss}
        isLoading={isLoadingStats || !stats}
        titleSize="m"
        title={
          <PrivilegesWarningIconWrapper
            hasPrivileges={definition.privileges.monitor}
            title="storageSize"
          >
            {statsError || !stats || !stats.sizeBytes ? '-' : formatBytes(stats.sizeBytes)}
          </PrivilegesWarningIconWrapper>
        }
        description={i18n.translate('xpack.streams.streamDetailLifecycle.storageSize', {
          defaultMessage: 'Storage size',
        })}
      />
      <EuiStat
        css={statCss}
        isLoading={isLoadingStats || !stats}
        titleSize="m"
        title={
          <PrivilegesWarningIconWrapper
            hasPrivileges={definition.privileges.monitor}
            title="totalDocCount"
          >
            {statsError || !stats || !stats.totalDocs ? '-' : formatNumber(stats.totalDocs, '0,0')}
          </PrivilegesWarningIconWrapper>
        }
        description={i18n.translate('xpack.streams.streamDetailLifecycle.totalDocs', {
          defaultMessage: 'Total doc count',
        })}
      />
    </EuiFlexGroup>
  );
}
