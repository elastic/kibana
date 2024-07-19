/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { DistributionBar as DistributionBarComponent } from '..';

const mockStatsFindings = [
  {
    key: 'passed',
    count: 90,
    color: euiThemeVars.euiColorVis0,
    label: 'Passed',
  },
  {
    key: 'failed',
    count: 10,
    color: euiThemeVars.euiColorVis9,
    label: <>{'Failed'}</>,
  },
];

const mockStatsAlerts = [
  {
    key: 'low',
    count: 1000,
    color: euiThemeVars.euiColorVis0,
  },
  {
    key: 'medium',
    count: 800,
    color: euiThemeVars.euiColorVis5,
  },
  {
    key: 'high',
    count: 300,
    color: euiThemeVars.euiColorVis7,
  },
  {
    key: 'critical',
    count: 50,
    color: euiThemeVars.euiColorVis9,
  },
];

export default {
  title: 'DistributionBar',
  description: 'Distribution Bar',
};

export const DistributionBar = () => {
  return [
    <React.Fragment key={'findings'}>
      <EuiTitle size={'xs'}>
        <h4>{'Findings'}</h4>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      <DistributionBarComponent stats={mockStatsFindings} />
      <EuiSpacer size={'m'} />
    </React.Fragment>,
    <React.Fragment key={'alerts'}>
      <EuiTitle size={'xs'}>
        <h4>{'Alerts'}</h4>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      <DistributionBarComponent stats={mockStatsAlerts} />
      <EuiSpacer size={'m'} />
    </React.Fragment>,
    <React.Fragment key={'empty'}>
      <EuiTitle size={'xs'}>
        <h4>{'Empty state'}</h4>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      <DistributionBarComponent stats={[]} />
    </React.Fragment>,
  ];
};
