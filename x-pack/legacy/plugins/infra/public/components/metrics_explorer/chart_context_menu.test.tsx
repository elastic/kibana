/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetricsExplorerChartContextMenu, createNodeDetailLink } from './chart_context_menu';
import { mount } from 'enzyme';
import { options, source, timeRange, chartOptions } from '../../utils/fixtures/metrics_explorer';
import { InfraNodeType } from '../../graphql/types';
import DateMath from '@elastic/datemath';
import { ReactWrapper } from 'enzyme';
import { Capabilities } from 'src/core/public';

const series = { id: 'exmaple-01', rows: [], columns: [] };
const uiCapabilities: Capabilities = {
  navLinks: { show: false },
  management: { fake: { show: false } },
  catalogue: { show: false },
  visualize: { show: true },
};

const getTestSubject = (component: ReactWrapper, name: string) => {
  return component.find(`[data-test-subj="${name}"]`).hostNodes();
};

describe('MetricsExplorerChartContextMenu', () => {
  describe('component', () => {
    it('should just work', async () => {
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={options}
          onFilter={onFilter}
          uiCapabilities={uiCapabilities}
          chartOptions={chartOptions}
        />
      );

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(1);
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(1);
    });

    it('should not display View metrics for incompatible groupBy', async () => {
      const customOptions = { ...options, groupBy: 'system.network.name' };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          onFilter={onFilter}
          uiCapabilities={uiCapabilities}
          chartOptions={chartOptions}
        />
      );
      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-ViewNodeMetrics').length).toBe(0);
    });

    it('should not display "Add Filter" without onFilter', async () => {
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={options}
          uiCapabilities={uiCapabilities}
          chartOptions={chartOptions}
        />
      );

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should not display "Add Filter" without options.groupBy', async () => {
      const customOptions = { ...options, groupBy: void 0 };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          onFilter={onFilter}
          uiCapabilities={uiCapabilities}
          chartOptions={chartOptions}
        />
      );

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-AddFilter').length).toBe(0);
    });

    it('should disable "Open in Visualize" when options.metrics is empty', async () => {
      const customOptions = { ...options, metrics: [] };
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          uiCapabilities={uiCapabilities}
          chartOptions={chartOptions}
        />
      );

      component.find('button').simulate('click');
      expect(
        getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').prop('disabled')
      ).toBeTruthy();
    });

    it('should not display "Open in Visualize" when unavailble in uiCapabilities', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={options}
          onFilter={onFilter}
          uiCapabilities={customUICapabilities}
          chartOptions={chartOptions}
        />
      );

      component.find('button').simulate('click');
      expect(getTestSubject(component, 'metricsExplorerAction-OpenInTSVB').length).toBe(0);
    });

    it('should not display anything when Visualize is disabled and there are no group bys.', async () => {
      const customUICapabilities = { ...uiCapabilities, visualize: { show: false } };
      const onFilter = jest.fn().mockImplementation((query: string) => void 0);
      const customOptions = { ...options, groupBy: void 0 };
      const component = mount(
        <MetricsExplorerChartContextMenu
          timeRange={timeRange}
          source={source}
          series={series}
          options={customOptions}
          onFilter={onFilter}
          uiCapabilities={customUICapabilities}
          chartOptions={chartOptions}
        />
      );
      expect(component.find('button').length).toBe(0);
    });
  });

  describe('helpers', () => {
    test('createNodeDetailLink()', () => {
      const fromDateStrig = '2019-01-01T11:00:00Z';
      const toDateStrig = '2019-01-01T12:00:00Z';
      const to = DateMath.parse(toDateStrig, { roundUp: true })!;
      const from = DateMath.parse(fromDateStrig)!;
      const link = createNodeDetailLink(
        InfraNodeType.host,
        'example-01',
        fromDateStrig,
        toDateStrig
      );
      expect(link).toBe(
        `#/link-to/host-detail/example-01?to=${to.valueOf()}&from=${from.valueOf()}`
      );
    });
  });
});
