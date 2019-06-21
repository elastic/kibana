/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { mount } from 'enzyme';
import React from 'react';
import { TimeRangeBar } from './timerange_bar';

describe('TimeRangeBar', () => {

  const timeRange = {
    fromPx: 1,
    label: 'Oct 27th 2018, 20:00 to Nov 11th 2018, 08:31',
    widthPx: 40.38226874737488
  };

  test('Renders gantt bar when isRunning is false', () => {
    const wrapper = mount(
      <TimeRangeBar timerange={timeRange} />
    );
    const ganttBar = wrapper.find('.mlJobSelector__ganttBar');

    expect(
      ganttBar.containsMatchingElement(
        <div className="mlJobSelector__ganttBar" />
      )
    ).toBeTruthy();
  });

  test('Renders running animation bar when isRunning is true', () => {
    const wrapper = mount(
      <TimeRangeBar timerange={timeRange} isRunning={true} />
    );
    const runningBar = wrapper.find('.mlJobSelector__ganttBarRunning');

    expect(runningBar.length).toEqual(1);
  });

});
