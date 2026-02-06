/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIconTip, EuiSpacer } from '@elastic/eui';
import { BaseIngestionCard } from '../../common/base_ingestion_card';
import type { EnhancedDataStreamStats } from '../../hooks/use_data_stream_stats';

export const IngestionCard = ({
  period,
  hasMonitorPrivileges,
  stats,
  statsError,
}: {
  period: 'daily' | 'monthly';
  hasMonitorPrivileges: boolean;
  stats?: EnhancedDataStreamStats;
  statsError?: Error;
}) => {
  const inaccurateMetric = Boolean(
    stats?.hasFailureStore && !stats.userPrivileges.canManageFailureStore
  );

  const isDaily = period === 'daily';

  const baseTooltipContent = i18n.translate('xpack.streams.ingestionCard.tooltip', {
    defaultMessage:
      'Approximate average, calculated by extrapolating the ingestion rate from the documents on the selected time range and the average document size{monthlyNote}.',
    values: { monthlyNote: isDaily ? '' : ', multiplied by 30' },
  });

  const tooltipContent = (
    <EuiIconTip
      type="question"
      content={
        inaccurateMetric ? (
          <>
            {baseTooltipContent}
            <EuiSpacer size="xs" />
            {i18n.translate('xpack.streams.ingestionCard.tooltip.privilegesWarning', {
              defaultMessage:
                'These averages may not be accurate because you lack sufficient privileges to access all the data.',
            })}
          </>
        ) : (
          baseTooltipContent
        )
      }
    />
  );

  return (
    <BaseIngestionCard
      period={period}
      hasPrivileges={hasMonitorPrivileges}
      bytesPerDay={stats?.bytesPerDay}
      perDayDocs={stats?.perDayDocs}
      statsError={statsError}
      tooltipContent={tooltipContent}
      dataTestSubjPrefix="ingestion"
    />
  );
};
