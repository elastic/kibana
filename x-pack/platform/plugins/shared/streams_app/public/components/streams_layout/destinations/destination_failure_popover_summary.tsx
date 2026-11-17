/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  formatPercentageParts,
  formatRateParts,
} from '../../../services/unit_stats_client/format_stats';
import type { DestinationFailedView } from '../../../services/unit_stats_client/types';
import {
  getFailureClasses,
  getFailureSubtitle,
  hasDestinationFailures,
} from './destination_failures';
import { StatCell } from '../../stream_detail_overview/stat_cell';
import { FailureSparkline } from './failure_sparkline';

/**
 * The failures of a destination at a glance, for the Map popover: for each class that has failures,
 * its name, the percentage and the rate as two separate stats, and a line of how the percentage is
 * trending. It has no breakdown by cause, which is for the flyout. It renders nothing when neither
 * class has failures. The percentage leads, in the danger color.
 */
export function DestinationFailurePopoverSummary({
  failed,
  minutes,
  dataTestSubj = 'streamsDestinationFailurePopoverSummary',
}: {
  failed: DestinationFailedView;
  /** How many minutes the figures cover. */
  minutes: number;
  dataTestSubj?: string;
}) {
  const { euiTheme } = useEuiTheme();
  if (!hasDestinationFailures(failed)) return null;

  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
    >
      <div>
        <EuiTitle size="xxs">
          <h4>
            {i18n.translate('xpack.streams.unitStats.failurePopoverSummary.title', {
              defaultMessage: 'Delivery failures',
            })}
          </h4>
        </EuiTitle>
        <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}Subtitle`}>
          {getFailureSubtitle(failed, minutes)}
        </EuiText>
      </div>
      {getFailureClasses(failed).map(({ id, key, title, failureClass }) => {
        const percentage = formatPercentageParts(failureClass.percentage);
        const rate = formatRateParts(failureClass.rate);

        return (
          <div key={key} data-test-subj={`${dataTestSubj}${key}`}>
            <EuiText size="s">
              <strong>{title}</strong>
            </EuiText>
            <div
              css={css`
                /* The two stats are as wide as their text, so a unit never wraps, and the sparkline
                   takes the rest of the row, never less than its minimum. */
                display: grid;
                grid-template-columns: auto auto minmax(${euiTheme.base * 6}px, 1fr);
                column-gap: ${euiTheme.size.l};
                align-items: center;
              `}
            >
              <StatCell
                title={i18n.translate('xpack.streams.unitStats.failurePopoverSummary.percentage', {
                  defaultMessage: 'Percentage',
                })}
                value={percentage.value}
                unit={percentage.unit === '' ? undefined : percentage.unit}
                data-test-subj={`${dataTestSubj}${key}Percentage`}
              />
              <StatCell
                title={i18n.translate('xpack.streams.unitStats.failurePopoverSummary.rate', {
                  defaultMessage: 'Rate',
                })}
                value={rate.value}
                unit={rate.unit === '' ? undefined : rate.unit}
                data-test-subj={`${dataTestSubj}${key}Rate`}
              />
              <div
                css={css`
                  min-inline-size: 0;
                `}
              >
                {failed.series && (
                  <FailureSparkline
                    series={failed.series}
                    failureClass={id}
                    dataTestSubj={`${dataTestSubj}${key}Sparkline`}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
