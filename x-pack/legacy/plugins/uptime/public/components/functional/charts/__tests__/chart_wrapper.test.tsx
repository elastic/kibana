/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { mount } from 'enzyme';
import { nextTick } from 'test_utils/enzyme_helpers';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { ChartWrapper } from '../chart_wrapper';
import { SnapshotHeading } from '../../snapshot_heading';
import { DonutChart } from '../donut_chart';
const SNAPSHOT_CHART_WIDTH = 144;
const SNAPSHOT_CHART_HEIGHT = 144;
describe('ChartWrapper component', () => {
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

  it('mounts the component with loading true or false', async () => {
    const component = mount(
      <ChartWrapper loading={true}>
        <SnapshotHeading down={8} total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} width={SNAPSHOT_CHART_WIDTH} />
      </ChartWrapper>
    );

    let loadingChart = component.find(`.euiLoadingChart`);
    expect(loadingChart.length).toBe(1);

    component.setProps({
      loading: false,
    });
    await nextTick();
    component.update();

    loadingChart = component.find(`.euiLoadingChart`);
    expect(loadingChart.length).toBe(0);
  });

  it('mounts the component with chart when loading true or false', async () => {
    const component = mount(
      <ChartWrapper loading={true}>
        <SnapshotHeading down={8} total={12} />
        <EuiSpacer size="xs" />
        <DonutChart up={4} down={8} height={SNAPSHOT_CHART_HEIGHT} width={SNAPSHOT_CHART_WIDTH} />
      </ChartWrapper>
    );

    let donutChart = component.find(DonutChart);
    expect(donutChart.length).toBe(1);

    component.setProps({
      loading: false,
    });
    await nextTick();
    component.update();

    donutChart = component.find(DonutChart);
    expect(donutChart.length).toBe(1);
  });
});
