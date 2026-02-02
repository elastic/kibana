/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLoadingChart, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchSignificantEvents } from '../../../../hooks/use_fetch_significant_events';
import { getFormattedError } from '../../../../util/errors';
import { SparkPlot } from '../../../spark_plot';

const CHART_WIDTH = '100px';
const EMPTY_COUNT_SYMBOL = '—';

interface SignificantEventsColumnProps {
  streamName: string;
}

export function SignificantEventsColumn({ streamName }: SignificantEventsColumnProps) {
  const { euiTheme } = useEuiTheme();
  const significantEventsFetchState = useFetchSignificantEvents({
    name: streamName,
  });

  if (significantEventsFetchState.isLoading) {
    return <LoadingPlaceholder />;
  }

  if (significantEventsFetchState.isError || !significantEventsFetchState.data) {
    return (
      <ErrorMessage
        error={significantEventsFetchState.error ?? new Error('Failed to load significant events')}
      />
    );
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="l"
      css={{ height: euiTheme.size.xl }}
    >
      <EventsCount count={significantEventsFetchState.data.total_occurrences} />
      <EuiFlexItem css={{ maxWidth: CHART_WIDTH }}>
        <SparkPlot
          id={`significant-events-histogram-${streamName}`}
          name={i18n.translate('xpack.streams.significantEventsTable.histogramSeriesTitle', {
            defaultMessage: 'Count',
          })}
          timeseries={significantEventsFetchState.data.aggregated_occurrences || []}
          type="bar"
          annotations={[]}
          compressed={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const LoadingPlaceholder = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
    >
      <EventsCount count={0} />
      <EuiFlexItem
        grow={false}
        className={css`
          width: ${CHART_WIDTH};
          display: flex;
          justify-content: center;
          align-items: center;
        `}
      >
        <EuiLoadingChart size="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ErrorMessage = ({ error }: { error: Error }) => {
  const message = getFormattedError(error).message;

  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" css={{ maxWidth: CHART_WIDTH }}>
      <EuiIconTip content={message} aria-label={message} type="warning" color="danger" />
    </EuiFlexGroup>
  );
};

const EventsCount = ({ count }: { count: number }) => {
  return (
    <EuiFlexItem
      grow={false}
      className={css`
        text-align: center;
        font-family: 'Roboto Mono', monospace;
      `}
    >
      {count === 0 ? EMPTY_COUNT_SYMBOL : count}
    </EuiFlexItem>
  );
};
