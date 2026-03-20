/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip } from '@elastic/eui';
import { BaseIngestionCard } from '../../common/base_ingestion_card';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';

export const IngestionCard = ({
  period,
  hasPrivileges,
  stats,
  statsError,
}: {
  period: 'daily' | 'monthly';
  hasPrivileges: boolean;
  stats?: EnhancedFailureStoreStats;
  statsError?: Error;
}) => {
  const isDaily = period === 'daily';

  const baseTooltipContent = i18n.translate('xpack.streams.ingestionCard.failureStore.tooltip', {
    defaultMessage:
      'Approximate average, calculated by extrapolating the ingestion rate from the failed documents on the selected time range and the average document size{monthlyNote}.',
    values: { monthlyNote: isDaily ? '' : ', multiplied by 30' },
  });

  const tooltipContent = <EuiIconTip type="question" content={baseTooltipContent} />;

  return (
    <BaseIngestionCard
      period={period}
      hasPrivileges={hasPrivileges}
      bytesPerDay={stats?.bytesPerDay}
      perDayDocs={stats?.perDayDocs}
      statsError={statsError}
      tooltipContent={tooltipContent}
      dataTestSubjPrefix="failureStoreIngestion"
    />
  );
};
