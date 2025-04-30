/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { TimeRangeBar } from './timerange_bar';

describe('TimeRangeBar', () => {
  const timeRange = {
    fromPx: 1,
    label: 'Oct 27th 2018, 20:00 to Nov 11th 2018, 08:31',
    widthPx: 40.38226874737488,
  };

  test('Renders gantt bar when isRunning is false', () => {
    const wrapper = mount(<TimeRangeBar timerange={timeRange} />);
    const ganttBar = wrapper.find('div[data-test-subj="mlJobSelectorGanttBar"]');

    expect(ganttBar).toHaveLength(1);
  });

  test('Renders running animation bar when isRunning is true', () => {
    const wrapper = mount(<TimeRangeBar timerange={timeRange} isRunning={true} />);
    const runningBar = wrapper.find('div[data-test-subj="mlJobSelectorGanttBarRunning"]');

    expect(runningBar).toHaveLength(1);
  });
});
