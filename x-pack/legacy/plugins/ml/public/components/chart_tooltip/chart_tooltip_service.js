/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

export const getChartTooltipDefaultState = () => ({
  isTooltipVisible: false,
  tooltipData: [],
  offset: { x: 0, y: 0 },
  targetPosition: { left: 0, top: 0 },
  tooltipPosition: { left: 0, top: 0 }
});

export const chartTooltip$ = new BehaviorSubject(getChartTooltipDefaultState());

export const mlChartTooltipService = {
  show: (tooltipData, target, offset = { x: 0, y: 0 }) => {
    if (typeof target !== 'undefined' && target !== null) {
      chartTooltip$.next({
        ...chartTooltip$.getValue(),
        isTooltipVisible: true,
        offset,
        targetPosition: target.getBoundingClientRect(),
        tooltipData,
      });
    }
  },
  hide: () => {
    chartTooltip$.next({
      ...getChartTooltipDefaultState(),
      isTooltipVisible: false
    });
  }
};
