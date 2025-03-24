/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { AbortableAsyncState } from '@kbn/react-hooks';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { ControlledEsqlChart } from '../../esql_chart/controlled_esql_chart';

interface StreamChartPanelProps {
  histogramQueryFetch: AbortableAsyncState<UnparsedEsqlResponse | undefined>;
  discoverLink?: string;
  timerange: {
    start: number;
    end: number;
  };
}

export function StreamChartPanel({
  histogramQueryFetch,
  discoverLink,
  timerange,
}: StreamChartPanelProps) {
  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup
        direction="column"
        className={css`
          height: 100%;
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {i18n.translate('xpack.streams.streamDetailOverview.logRate', {
                  defaultMessage: 'Documents',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="streamsDetailOverviewOpenInDiscoverButton"
              iconType="discoverApp"
              href={discoverLink}
              isDisabled={!discoverLink}
            >
              {i18n.translate('xpack.streams.streamDetailOverview.openInDiscoverButtonLabel', {
                defaultMessage: 'Open in Discover',
              })}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow>
          <ControlledEsqlChart
            result={histogramQueryFetch}
            id="entity_log_rate"
            metricNames={['metric']}
            chartType={'bar'}
            timerange={timerange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
