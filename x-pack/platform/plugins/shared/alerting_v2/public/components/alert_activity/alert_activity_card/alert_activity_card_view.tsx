/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Theme } from '@elastic/charts';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import { AlertActivitySparkline } from './alert_activity_sparkline';

const cardTitle = i18n.translate('xpack.alertingV2.alertActivityCard.title', {
  defaultMessage: 'Alert activity',
});

const activeLabel = i18n.translate('xpack.alertingV2.alertActivityCard.activeLabel', {
  defaultMessage: 'Active',
});

const recoveredLabel = i18n.translate('xpack.alertingV2.alertActivityCard.recoveredLabel', {
  defaultMessage: 'Recovered',
});

export interface AlertActivityCardViewProps {
  isLoading?: boolean;
  isError?: boolean;
  data?: AlertSummaryResponse;
  lookbackLabel?: string;
  /** Optional elastic-charts base theme threaded through to the sparklines. */
  baseTheme?: Theme;
}

/**
 * Pure presentational component for the alert activity card. Keeping the
 * rendering logic free of DI/service hooks makes this easy to exercise from
 * Storybook and unit tests without wiring up a Kibana container.
 */
export const AlertActivityCardView = ({
  isLoading,
  isError,
  data,
  lookbackLabel,
  baseTheme,
}: AlertActivityCardViewProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertActivityCard">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{cardTitle}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {lookbackLabel && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="alertActivityCardLookback">
              {lookbackLabel}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading && (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          data-test-subj="alertActivityCardLoading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {!isLoading && isError && (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="warning"
          data-test-subj="alertActivityCardError"
          title={i18n.translate('xpack.alertingV2.alertActivityCard.errorTitle', {
            defaultMessage: 'Unable to load alert activity',
          })}
        />
      )}

      {!isLoading && !isError && data && (
        <EuiFlexGroup gutterSize="l" responsive={false}>
          <EuiFlexItem>
            <EuiStat
              data-test-subj="alertActivityCardActive"
              description={activeLabel}
              title={data.activeEventCount}
              titleColor="danger"
              titleSize="m"
              reverse
            />
            <AlertActivitySparkline
              series={data.activeSeries}
              color={euiTheme.colors.danger}
              baseTheme={baseTheme}
              ariaLabel={i18n.translate(
                'xpack.alertingV2.alertActivityCard.activeSparklineAriaLabel',
                { defaultMessage: 'Active alert events over time' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              data-test-subj="alertActivityCardRecovered"
              description={recoveredLabel}
              title={data.recoveredEventCount}
              titleColor="success"
              titleSize="m"
              reverse
            />
            <AlertActivitySparkline
              series={data.recoveredSeries}
              color={euiTheme.colors.success}
              baseTheme={baseTheme}
              ariaLabel={i18n.translate(
                'xpack.alertingV2.alertActivityCard.recoveredSparklineAriaLabel',
                { defaultMessage: 'Recovered alert events over time' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
