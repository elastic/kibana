/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';

const doc = document.documentElement;

const chartTooltipDefaultState = {
  isTooltipVisible: false,
  tooltipData: [],
  tooltipPosition: { transform: 'translate(0px, 0px)' }
};

export const chartTooltip$ = new BehaviorSubject(chartTooltipDefaultState);

export const mlChartTooltipService = {
  element: null,
};

mlChartTooltipService.show = function (tooltipData, target, offset = { x: 0, y: 0 }) {
  if (this.element === null || typeof target === 'undefined') {
    return;
  }

  // side bar width
  const euiNavDrawer = document.getElementsByClassName('euiNavDrawer');

  if (euiNavDrawer.length === 0) {
    return;
  }

  // enable the tooltip to render it in the DOM
  // so the correct `tooltipWidth` gets returned.
  const tooltipState = {
    ...chartTooltipDefaultState,
    isTooltipVisible: true,
    tooltipData,
  };
  chartTooltip$.next(tooltipState);

  const navOffset = euiNavDrawer[0].clientWidth; // Offset by width of side navbar
  const contentWidth = document.body.clientWidth - navOffset;
  const tooltipWidth = this.element.clientWidth;

  const pos = target.getBoundingClientRect();
  let left = pos.left + offset.x + 4 - navOffset;
  if (left + tooltipWidth > contentWidth) {
    // the tooltip is hanging off the side of the page,
    // so move it to the other side of the target
    const markerWidthAdjustment = 10;
    left = left - (tooltipWidth + offset.x + markerWidthAdjustment);
  }

  // Calculate top offset
  const scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
  const topNavHeightAdjustment = 190;
  const top = pos.top + offset.y + scrollTop - topNavHeightAdjustment;

  // render the tooltip with adjusted position.
  chartTooltip$.next({
    ...tooltipState,
    tooltipPosition: { transform: `translate(${left}px, ${top}px)` }
  });

};

// When selecting multiple cells using dragSelect, we need to quickly
// hide the tooltip with `noTransition`, otherwise, if the mouse pointer
// enters the tooltip while dragging, it will cancel selecting multiple
// swimlane cells which we'd like to avoid of course.
mlChartTooltipService.hide = function () {
  chartTooltip$.next({
    ...chartTooltipDefaultState,
    isTooltipVisible: false
  });
};
