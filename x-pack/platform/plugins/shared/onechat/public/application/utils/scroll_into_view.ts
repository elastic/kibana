/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Scrolls an element into the viewport if it's not already visible.
 *
 * @param element The HTML element to scroll into view.
 */
export const scrollIntoViewIfNeeded = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const isVisible =
    rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

  if (!isVisible) {
    element.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
};
