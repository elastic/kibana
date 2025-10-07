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

  const title = (
    <EuiToolTip
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
            'Approximate average (failure store indices total size divided by the number of days since creation)',
        }
      )}
    >
      <FormattedMessage
        id="xpack.streams.streamDetailView.failureStoreEnabled.failedIngestionCard.title"
        defaultMessage="Failed ingestion averages {tooltipIcon}"
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
          hasPrivileges={hasPrivileges}
          title={i18n.translate(
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.storagesizeLabel',
            { defaultMessage: 'storageSize' }
          )}
        >
          {statsError || !stats || !stats.bytesPerDay ? '-' : formatBytes(stats.bytesPerDay)}
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
            'xpack.streams.ingestionCard.privilegesWarningIconWrapper.storagesizeLabel',
            { defaultMessage: 'storageSize' }
          )}
        >
          {statsError || !stats || !stats.bytesPerDay ? '-' : formatBytes(stats.bytesPerDay * 30)}
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
