/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import { Sparkline } from '../';

describe('Sparkline component', () => {
  let component;
  let renderedComponent;
  let mockDataPoint;

  beforeEach(() => {
    component = (
      <Sparkline
        series={[
          [1513814814, 20],
          [1513814914, 25],
          [1513815114, 10],
        ]}
        tooltip={{
          enabled: true,
          xValueFormatter: x => x,
          yValueFormatter: y => y,
        }}
        options={{
          xaxis: {
            min: 1513814800,
            max: 1513815200,
          },
        }}
      />
    );
    renderedComponent = renderer.create(component);
    mockDataPoint = {
      xValue: 25,
      yValue: 1513814914,
      xPosition: 200,
      yPosition: 45,
      plotTop: 40,
      plotLeft: 150,
      plotHeight: 30,
      plotWidth: 100,
    };
  });

  test('does not show tooltip initially', () => {
    const tree = renderedComponent.toJSON();
    expect(tree).toMatchSnapshot();
  });

  test('shows tooltip on hover', () => {
    const sparkline = renderedComponent.getInstance();
    sparkline.onHover(mockDataPoint);

    const tree = renderedComponent.toJSON();
    expect(tree).toMatchSnapshot();
  });

  test('removes tooltip when tooltip.enabled prop is changed to false', () => {
    const wrapper = shallow(component);
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(0);

    wrapper.setState({ tooltip: mockDataPoint });
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(1);

    wrapper.setProps({ tooltip: { enabled: false } });
    expect(wrapper.find('.monSparklineTooltip__container')).toHaveLength(0);
  });
});
