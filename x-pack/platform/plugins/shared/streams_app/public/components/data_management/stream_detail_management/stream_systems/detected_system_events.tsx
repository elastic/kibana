/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { System } from '@kbn/streams-schema';

import React from 'react';
import { Chart, BarSeries, Settings } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSystemEvents } from './hooks/use_system_events';

export const DetectedSystemEvents = ({ system }: { system: System }) => {
  const chartBaseTheme = useElasticChartsTheme();

  const events = useSystemEvents(system);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.streams.detectedSystemEvents.label', {
              defaultMessage: 'Detected system events',
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            aria-label={i18n.translate('xpack.streams.detectedSystemEvents.viewAllLinkAriaLabel', {
              defaultMessage: 'Open in discover',
            })}
          >
            {i18n.translate('xpack.streams.detectedSystemEvents.viewAllLinkText', {
              defaultMessage: 'Open in discover',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Chart size={{ height: 64 }}>
        <Settings baseTheme={chartBaseTheme} showLegend={false} />
        <BarSeries id="numbers" data={events} xAccessor={0} yAccessors={[1]} />
      </Chart>
    </>
  );
};
