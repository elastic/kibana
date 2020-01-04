/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPanel, EuiSelect } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { memo } from 'react';

import { HeaderSection } from '../../../../components/header_section';
import { HistogramSignals } from '../../../../components/page/detection_engine/histogram_signals';

export const sampleChartOptions = [
  { text: 'Risk scores', value: 'risk_scores' },
  { text: 'Severities', value: 'severities' },
  { text: 'Top destination IPs', value: 'destination_ips' },
  { text: 'Top event actions', value: 'event_actions' },
  { text: 'Top event categories', value: 'event_categories' },
  { text: 'Top host names', value: 'host_names' },
  { text: 'Top rule types', value: 'rule_types' },
  { text: 'Top rules', value: 'rules' },
  { text: 'Top source IPs', value: 'source_ips' },
  { text: 'Top users', value: 'users' },
];

const SignalsChartsComponent = () => (
  <EuiPanel>
    <HeaderSection title="Signal detection frequency">
      <EuiSelect
        options={sampleChartOptions}
        onChange={() => noop}
        prepend="Stack by"
        value={sampleChartOptions[0].value}
      />
    </HeaderSection>

    <HistogramSignals />
  </EuiPanel>
);

SignalsChartsComponent.displayName = 'SignalsChartsComponent';

export const SignalsCharts = memo(SignalsChartsComponent);
