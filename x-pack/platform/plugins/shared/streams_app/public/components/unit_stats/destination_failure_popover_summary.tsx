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
  formatFailureBasis,
  formatPercentageParts,
  formatRateParts,
} from '../../services/unit_stats_client/format_stats';
import type { DestinationFailedView } from '../../services/unit_stats_client/types';
import {
  getFailureClasses,
  hasDestinationFailures,
  hasFailures,
  type FailurePeriod,
} from './destination_failures';
import { FailureSparkline } from './failure_sparkline';

/**
 * What the figures are a share of, and for how long, said once: `Of events in the last 15
 * minutes`. A destination reports in one unit, so the first class with failures names it.
 */
function FailureSubtitle({
  failed,
  period,
  dataTestSubj,
}: {
  failed: DestinationFailedView;
  period: FailurePeriod;
  dataTestSubj: string;
}) {
  const { unit } = hasFailures(failed.authentication)
    ? failed.authentication
    : failed.authorization;
  const basis = formatFailureBasis(unit);

  return (
    <EuiText size="xs" color="subdued" data-test-subj={dataTestSubj}>
      {period.kind === 'lastMinutes'
        ? i18n.translate('xpack.streams.unitStats.failurePopoverSummary.subtitleLastMinutes', {
            defaultMessage:
              'Of {basis} in the last {minutes, plural, one {minute} other {# minutes}}',
            values: { basis, minutes: period.minutes },
          })
        : i18n.translate('xpack.streams.unitStats.failurePopoverSummary.subtitleTimePicker', {
            defaultMessage: 'Of {basis} based on the time picker',
            values: { basis },
          })}
    </EuiText>
  );
}

/**
 * A stat in the style of the stats of the flyout: a title in regular weight and the subdued color,
 * then the number, which is the only bold part, in the default text color, and its unit beside it,
 * smaller and in regular weight. The unit sits 4 px from the number, and neither ever wraps.
 */
function FailureStat({
  title,
  value,
  unit,
  dataTestSubj,
}: {
  title: string;
  value: string;
  unit: string;
  dataTestSubj: string;
}) {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiText size="s" color="subdued">
        <p>{title}</p>
      </EuiText>
      <div
        css={css`
          display: flex;
          align-items: baseline;
          gap: ${euiTheme.size.xs};
          white-space: nowrap;
        `}
      >
        <EuiTitle size="m">
          <span data-test-subj={`${dataTestSubj}Value`}>{value}</span>
        </EuiTitle>
        {unit !== '' && (
          <EuiText size="s" color="subdued">
            <span data-test-subj={`${dataTestSubj}Unit`}>{unit}</span>
          </EuiText>
        )}
      </div>
    </div>
  );
}

/**
 * The failures of a destination at a glance, for the Map popover: for each class that has failures,
 * its name, the percentage and the rate as two separate stats, and a line of how the percentage is
 * trending. It has no breakdown by cause, which is for the flyout. It renders nothing when neither
 * class has failures. The percentage leads, in the danger color.
 */
export function DestinationFailurePopoverSummary({
  failed,
  period,
  dataTestSubj = 'streamsDestinationFailurePopoverSummary',
}: {
  failed: DestinationFailedView;
  period: FailurePeriod;
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
        <FailureSubtitle failed={failed} period={period} dataTestSubj={`${dataTestSubj}Subtitle`} />
      </div>
      {getFailureClasses(failed).map(({ key, title, failureClass }) => {
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
              <FailureStat
                title={i18n.translate('xpack.streams.unitStats.failurePopoverSummary.percentage', {
                  defaultMessage: 'Percentage',
                })}
                value={percentage.value}
                unit={percentage.unit}
                dataTestSubj={`${dataTestSubj}${key}Percentage`}
              />
              <FailureStat
                title={i18n.translate('xpack.streams.unitStats.failurePopoverSummary.rate', {
                  defaultMessage: 'Rate',
                })}
                value={rate.value}
                unit={rate.unit}
                dataTestSubj={`${dataTestSubj}${key}Rate`}
              />
              <div
                css={css`
                  min-inline-size: 0;
                `}
              >
                {failureClass.series && (
                  <FailureSparkline
                    series={failureClass.series}
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
