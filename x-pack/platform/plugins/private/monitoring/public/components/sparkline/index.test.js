/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { EuiThemeProvider } from '@elastic/eui';
import { shallow } from 'enzyme';
import { Sparkline } from '.';

jest.mock('./sparkline_flot_chart', () => ({
  SparklineFlotChart: () => 'SparklineFlotChart',
}));

const getComponent = () => (
  <Sparkline
    series={[
      [1513814814, 20],
      [1513814914, 25],
      [1513815114, 10],
    ]}
    tooltip={{
      enabled: true,
      xValueFormatter: (x) => x,
      yValueFormatter: (y) => y,
    }}
    options={{
      xaxis: {
        min: 1513814800,
        max: 1513815200,
      },
    }}
  />
);

const mockDataPoint = {
  xValue: 25,
  yValue: 1513814914,
  xPosition: 200,
  yPosition: 45,
  plotTop: 40,
  plotLeft: 150,
  plotHeight: 30,
  plotWidth: 100,
};

describe('Sparkline component', () => {
  test('does not show tooltip initially', () => {
    const renderedComponent = renderer.create(getComponent());
    const tree = renderedComponent.toJSON();
    expect(tree).toMatchSnapshot();
  });

  test('removes tooltip when tooltip.enabled prop is changed to false', () => {
    const wrapper = shallow(getComponent());
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(0);

    wrapper.setState({ tooltip: mockDataPoint });
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(1);

    wrapper.setProps({ tooltip: { enabled: false } });
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(0);
  });
});

describe('Sparkline component with EuiProvider', () => {
  test('shows tooltip on hover', () => {
    const wrapper = shallow(getComponent(), {
      wrappingComponent: EuiThemeProvider,
    });

    wrapper.instance().onHover(mockDataPoint);

    wrapper.update();

    expect(wrapper).toMatchSnapshot();
  });
});
