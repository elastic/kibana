/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ChartWrapper } from '../chart_wrapper';
import { SnapshotHeading } from '../../snapshot_heading';
import { DonutChart } from '../donut_chart';

describe('ChartWrapper component', () => {
  const SNAPSHOT_CHART_WIDTH = 144;
  const SNAPSHOT_CHART_HEIGHT = 144;

  it('renders the component with loading false', () => {
    const component = shallowWithIntl(
      <ChartWrapper loading={false}>
        <SnapshotHeading down={8} total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} width={SNAPSHOT_CHART_WIDTH} />
      </ChartWrapper>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders the component with loading true', () => {
    const component = shallowWithIntl(
      <ChartWrapper loading={true}>
        <SnapshotHeading down={8} total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} width={SNAPSHOT_CHART_WIDTH} />
      </ChartWrapper>
    );
    expect(component).toMatchSnapshot();
  });
});
