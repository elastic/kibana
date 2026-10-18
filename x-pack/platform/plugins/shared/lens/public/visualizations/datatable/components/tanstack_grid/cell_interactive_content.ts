/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Cells are single tab stops of the grid. Interactive content inside of a cell, like links and buttons,
 * is taken out of the tab order until the cell is in interactive mode, which Enter or F2 on the cell
 * starts and Escape or leaving the cell ends. This is how EuiDataGrid treats interactive cell content.
 */
const INTERACTIVE_SELECTOR =
  'a[href], button, input, select, textarea, [contenteditable="true"], [tabindex]';

/** Holds the `tabindex` an element had before it was taken out of the tab order. */
const ORIGINAL_TABINDEX_ATTRIBUTE = 'data-lns-original-tabindex';

export const getInteractiveElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR));

/** Takes the interactive content of a container out of the tab order, or puts it back. */
export const setInteractiveContentTabbable = (container: HTMLElement, isTabbable: boolean) => {
  getInteractiveElements(container).forEach((element) => {
    const original = element.getAttribute(ORIGINAL_TABINDEX_ATTRIBUTE);
    if (isTabbable) {
      if (original === null) {
        return;
      }
      if (original === '') {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', original);
      }
      element.removeAttribute(ORIGINAL_TABINDEX_ATTRIBUTE);
    } else if (original === null) {
      element.setAttribute(ORIGINAL_TABINDEX_ATTRIBUTE, element.getAttribute('tabindex') ?? '');
      element.setAttribute('tabindex', '-1');
    }
  });
};
