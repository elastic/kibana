/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TimeRangeBar } from './timerange_bar';

describe('TimeRangeBar', () => {
  const timeRange = {
    fromPx: 1,
    label: 'Oct 27th 2018, 20:00 to Nov 11th 2018, 08:31',
    widthPx: 40.38226874737488,
  };

  test('Renders gantt bar when isRunning is false', () => {
    const { getByTestId } = render(<TimeRangeBar timerange={timeRange} />);
    const ganttBar = getByTestId('mlJobSelectorGanttBar');

    expect(ganttBar).toBeInTheDocument();
  });

  test('Renders running animation bar when isRunning is true', () => {
    const { getByTestId } = render(<TimeRangeBar timerange={timeRange} isRunning={true} />);
    const runningBar = getByTestId('mlJobSelectorGanttBarRunning');

    expect(runningBar).toBeInTheDocument();
  });
});
