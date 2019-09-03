/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import $ from 'jquery';

const doc = document.documentElement;
const FADE_TIMEOUT_MS = 200;

export const mlChartTooltipService = {
  element: null,
  fadeTimeout: null,
  visible: false
};

mlChartTooltipService.show = function (contents, target, offset = { x: 0, y: 0 }) {
  if (this.element === null || typeof target === 'undefined') {
    return;
  }

  this.visible = true;
  // if a previous fade out was happening, stop it
  if (this.fadeTimeout !== null) {
    clearTimeout(this.fadeTimeout);
  }

  // populate the tooltip contents
  this.element.html(contents);

  // side bar width
  const navOffset = $('.euiNavDrawer').width() || 0;  // Offset by width of side navbar
  const contentWidth = $('body').width() - navOffset;
  const tooltipWidth = this.element.width();

  const pos = target.getBoundingClientRect();
  let left = (pos.left + (offset.x) + 4) - navOffset;
  if (left + tooltipWidth > contentWidth) {
    // the tooltip is hanging off the side of the page,
    // so move it to the other side of the target
    const markerWidthAdjustment = 22;
    left = left - (tooltipWidth + offset.x + markerWidthAdjustment);
  }

  // Calculate top offset
  const scrollTop = (window.pageYOffset || doc.scrollTop) - (doc.clientTop || 0);
  const topNavHeightAdjustment = 75;
  const top = pos.top + (offset.y) + scrollTop - topNavHeightAdjustment;

  this.element.css({
    left,
    top,
    opacity: '0.9',
    display: 'block'
  });
};

// When selecting multiple cells using dargSelect, we need to quickly
// hide the tooltip with `noTransition`, otherwise, if the mouse pointer
// enters the tooltip while dragging, it will cancel selecting multiple
// swimlane cells which we'd like to avoid of course.
mlChartTooltipService.hide = function (noTransition = false) {
  if (this.element === null) {
    return;
  }

  this.visible = false;

  if (noTransition) {
    this.element.addClass('mlChartTooltip--noTransition');
    this.element.css({ opacity: '0', display: 'none' });
    this.element.removeClass('mlChartTooltip--noTransition');
    return;
  }

  this.element.css({ opacity: '0' });

  // after the fade out transition has finished, set the display to
  // none so it doesn't block any mouse events underneath it.
  this.fadeTimeout = setTimeout(() => {
    if (this.visible === false) {
      this.element.css('display', 'none');
    }
    this.fadeTimeout = null;
  }, FADE_TIMEOUT_MS);
};
