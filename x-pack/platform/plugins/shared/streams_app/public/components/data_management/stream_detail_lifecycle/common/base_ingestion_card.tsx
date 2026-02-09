/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatNumber } from '@elastic/eui';
import { PrivilegesWarningIconWrapper } from '../../../insufficient_privileges/insufficient_privileges';
import { BaseMetricCard } from './base_metric_card';
import { formatBytes } from '../helpers/format_bytes';

interface BaseIngestionCardProps {
  period: 'daily' | 'monthly';
  hasPrivileges: boolean;
  bytesPerDay?: number;
  perDayDocs?: number;
  statsError?: Error;
  tooltipContent: React.ReactNode;
  dataTestSubjPrefix: string;
}

export const BaseIngestionCard = ({
  period,
  hasPrivileges,
  bytesPerDay,
  perDayDocs,
  statsError,
  tooltipContent,
  dataTestSubjPrefix,
}: BaseIngestionCardProps) => {
  const isDaily = period === 'daily';
  const multiplier = isDaily ? 1 : 30;

  return (
    <BaseMetricCard
      data-test-subj="ingestionCard"
      title={
        <FormattedMessage
          id="xpack.streams.ingestionCard.title"
          defaultMessage="{period} ingestion average {tooltipIcon}"
          values={{
            period: isDaily ? 'Daily' : 'Monthly',
            tooltipIcon: tooltipContent,
          }}
        />
      }
      metrics={[
        {
          data: (
            <PrivilegesWarningIconWrapper
              hasPrivileges={hasPrivileges}
              title={isDaily ? 'ingestionDaily' : 'ingestionMonthly'}
            >
              {statsError || bytesPerDay === undefined
                ? '-'
                : formatBytes(bytesPerDay * multiplier)}
            </PrivilegesWarningIconWrapper>
          ),
          subtitle: (
            <FormattedMessage
              id="xpack.streams.ingestionCard.subtitle"
              defaultMessage="{perDayDocs} documents"
              values={{
                perDayDocs: perDayDocs ? formatNumber(perDayDocs * multiplier, '0,0') : '-',
              }}
            />
          ),
          'data-test-subj': `${dataTestSubjPrefix}-${period}`,
        },
      ]}
    />
  );
};
