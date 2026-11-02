/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MIN_HEIGHT = 400;

// Displayed margin of the tab content to the window bottom
export const DEFAULT_MARGIN_BOTTOM = 16;

export function getTabContentAvailableHeight(
  elementRef: HTMLElement | undefined,
  decreaseAvailableHeightBy: number
): number {
  if (!elementRef) {
    return 0;
  }

  // assign a good height filling the available space of the document flyout
  const position = elementRef.getBoundingClientRect();
  return Math.max(window.innerHeight - position.top - decreaseAvailableHeightBy, MIN_HEIGHT);
}
