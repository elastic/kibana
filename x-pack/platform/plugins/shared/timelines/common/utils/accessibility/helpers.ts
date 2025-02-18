/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME,
  HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME,
  NOTES_CONTAINER_CLASS_NAME,
  NOTE_CONTENT_CLASS_NAME,
  ROW_RENDERER_CLASS_NAME,
} from '@kbn/securitysolution-t-grid';
/**
 * The name of the ARIA attribute representing a column, used in conjunction with
 * the ARIA: grid role https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 */
export const ARIA_COLINDEX_ATTRIBUTE = 'aria-colindex';

/**
 * This alternative attribute to `aria-colindex` is used to decorate the data
 * in existing `EuiTable`s to enable keyboard navigation with minimal
 * refactoring of existing code until we're ready to migrate to `EuiDataGrid`.
 * It may be applied directly to keyboard-focusable elements and thus doesn't
 * have exactly the same semantics as `aria-colindex`.
 */
export const DATA_COLINDEX_ATTRIBUTE = 'data-colindex';

/**
 * The name of the ARIA attribute representing a row, used in conjunction with
 * the ARIA: grid role https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 */
export const ARIA_ROWINDEX_ATTRIBUTE = 'aria-rowindex';

/**
 * This alternative attribute to `aria-rowindex` is used to decorate the data
 * in existing `EuiTable`s to enable keyboard navigation with minimal
 * refactoring of existing code until we're ready to migrate to `EuiDataGrid`.
 * It's typically applied to `<tr>` elements via `EuiTable`'s `rowProps` prop.
 */
export const DATA_ROWINDEX_ATTRIBUTE = 'data-rowindex';

/** `aria-colindex` and `aria-rowindex` start at one */
export const FIRST_ARIA_INDEX = 1;

/** Converts an aria index, which starts at one, to an array index, which starts at zero */
export const ariaIndexToArrayIndex = (ariaIndex: number) => ariaIndex - 1;

/** Converts an array index, which starts at zero, to an aria index, which starts at one */
export const arrayIndexToAriaIndex = (arrayIndex: number) => arrayIndex + 1;

/** Returns `true` if the left or right arrow was pressed  */
export const isArrowRightOrArrowLeft = (event: React.KeyboardEvent): boolean =>
  event.key === 'ArrowLeft' || event.key === 'ArrowRight';

/** Returns `true` if the down arrow key was pressed */
export const isArrowDown = (event: React.KeyboardEvent): boolean => event.key === 'ArrowDown';

/** Returns `true` if the up arrow key was pressed */
export const isArrowUp = (event: React.KeyboardEvent): boolean => event.key === 'ArrowUp';

/** Returns `true` if the down or up arrow was pressed  */
export const isArrowDownOrArrowUp = (event: React.KeyboardEvent): boolean =>
  isArrowDown(event) || isArrowUp(event);

/** Returns `true` if an arrow key was pressed */
export const isArrowKey = (event: React.KeyboardEvent): boolean =>
  isArrowRightOrArrowLeft(event) || isArrowDownOrArrowUp(event);

/** Returns `true` if the right arrow key was pressed */
export const isArrowRight = (event: React.KeyboardEvent): boolean => event.key === 'ArrowRight';

/** Returns `true` if the escape key was pressed */
export const isEscape = (event: React.KeyboardEvent): boolean => event.key === 'Escape';

/** Returns `true` if the home key was pressed */
export const isHome = (event: React.KeyboardEvent): boolean => event.key === 'Home';

/** Returns `true` if the end key was pressed */
export const isEnd = (event: React.KeyboardEvent): boolean => event.key === 'End';

/** Returns `true` if the home or end key was pressed */
export const isHomeOrEnd = (event: React.KeyboardEvent): boolean => isHome(event) || isEnd(event);

/** Returns `true` if the page up key was pressed */
export const isPageUp = (event: React.KeyboardEvent): boolean => event.key === 'PageUp';

/** Returns `true` if the page down key was pressed */
export const isPageDown = (event: React.KeyboardEvent): boolean => event.key === 'PageDown';

/** Returns `true` if the page up or page down key was pressed */
export const isPageDownOrPageUp = (event: React.KeyboardEvent): boolean =>
  isPageDown(event) || isPageUp(event);

/** Returns `true` if the tab key was pressed */
export const isTab = (event: React.KeyboardEvent): boolean => event.key === 'Tab';

/** Returns `previous` or `next`, depending on which arrow key was pressed */
export const getFocusOnFromArrowKey = (event: React.KeyboardEvent): 'previous' | 'next' =>
  event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? 'previous' : 'next';

/**
 * Returns the column that directly owns focus, or contains a focused element,
 * using the `aria-colindex` attribute.
 */
export const getFocusedColumn = ({
  colindexAttribute,
  element,
}: {
  colindexAttribute: string;
  element: Element | null;
}): Element | null => {
  return element?.querySelector(`[${colindexAttribute}]:focus-within`) ?? null;
};

/** Returns the numeric `aria-colindex` of the specified element */
export const getColindex = ({
  colindexAttribute,
  element,
}: {
  colindexAttribute: string;
  element: Element | null;
}): number | null =>
  element?.getAttribute(colindexAttribute) != null
    ? Number(element?.getAttribute(colindexAttribute))
    : null;

/**  Returns the row that directly owns focus, or contains a focused element */
export const getFocusedRow = ({
  rowindexAttribute,
  element,
}: {
  rowindexAttribute: string;
  element: Element | null;
}): Element | null => element?.querySelector(`[${rowindexAttribute}]:focus-within`) ?? null;

/** Returns the numeric `aria-rowindex` of the specified element */
export const getRowindex = ({
  rowindexAttribute,
  element,
}: {
  rowindexAttribute: string;
  element: Element | null;
}): number | null =>
  element?.getAttribute(rowindexAttribute) != null
    ? Number(element?.getAttribute(rowindexAttribute))
    : null;

/** Returns the row with the specified `aria-rowindex` */
export const getRowByAriaRowindex = ({
  ariaRowindex,
  element,
  rowindexAttribute,
}: {
  ariaRowindex: number;
  element: Element | null;
  rowindexAttribute: string;
}): HTMLDivElement | null =>
  element?.querySelector<HTMLDivElement>(`[${rowindexAttribute}="${ariaRowindex}"]`) ?? null;

/** Returns the `previous` or `next` `aria-colindex` relative to the currently focused `aria-colindex` */
export const getNewAriaColindex = ({
  focusedAriaColindex,
  focusOn,
  maxAriaColindex,
}: {
  focusedAriaColindex: number;
  focusOn: 'previous' | 'next';
  maxAriaColindex: number;
}): number => {
  const newAriaColindex =
    focusOn === 'previous' ? focusedAriaColindex - 1 : focusedAriaColindex + 1;

  if (newAriaColindex < FIRST_ARIA_INDEX) {
    return FIRST_ARIA_INDEX;
  }

  if (newAriaColindex > maxAriaColindex) {
    return maxAriaColindex;
  }

  return newAriaColindex;
};

/** Returns the element at the specified `aria-colindex` */
export const getElementWithMatchingAriaColindex = ({
  ariaColindex,
  colindexAttribute,
  element,
}: {
  ariaColindex: number;
  colindexAttribute: string;
  element: HTMLDivElement | null;
}): HTMLDivElement | null => {
  if (element?.getAttribute(colindexAttribute) === `${ariaColindex}`) {
    return element; // the current element has it
  }

  return element?.querySelector<HTMLDivElement>(`[${colindexAttribute}="${ariaColindex}"]`) ?? null;
};

/** Returns the `previous` or `next` `aria-rowindex` relative to the currently focused `aria-rowindex` */
export const getNewAriaRowindex = ({
  focusedAriaRowindex,
  focusOn,
  maxAriaRowindex,
}: {
  focusedAriaRowindex: number;
  focusOn: 'previous' | 'next';
  maxAriaRowindex: number;
}): number => {
  const newAriaRowindex =
    focusOn === 'previous' ? focusedAriaRowindex - 1 : focusedAriaRowindex + 1;

  if (newAriaRowindex < FIRST_ARIA_INDEX) {
    return FIRST_ARIA_INDEX;
  }

  if (newAriaRowindex > maxAriaRowindex) {
    return maxAriaRowindex;
  }

  return newAriaRowindex;
};

/** Returns the first `aria-rowindex` if the home key is pressed, otherwise the last `aria-rowindex` is returned */
export const getFirstOrLastAriaRowindex = ({
  event,
  maxAriaRowindex,
}: {
  event: React.KeyboardEvent;
  maxAriaRowindex: number;
}): number => (isHome(event) ? FIRST_ARIA_INDEX : maxAriaRowindex);

interface FocusColumnResult {
  newFocusedColumn: HTMLDivElement | null;
  newFocusedColumnAriaColindex: number | null;
}

/**
 * SIDE EFFECT: mutates the DOM by focusing the specified column
 * returns the `aria-colindex` of the newly-focused column
 */
export const focusColumn = ({
  colindexAttribute,
  containerElement,
  ariaColindex,
  ariaRowindex,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: Element | null;
  ariaColindex: number;
  ariaRowindex: number;
  rowindexAttribute: string;
}): FocusColumnResult => {
  if (containerElement == null) {
    return {
      newFocusedColumnAriaColindex: null,
      newFocusedColumn: null,
    };
  }

  const row = getRowByAriaRowindex({ ariaRowindex, element: containerElement, rowindexAttribute });

  const column = getElementWithMatchingAriaColindex({
    ariaColindex,
    colindexAttribute,
    element: row,
  });

  if (column != null) {
    column.focus(); // DOM mutation side effect
    return {
      newFocusedColumnAriaColindex: ariaColindex,
      newFocusedColumn: column,
    };
  }

  return {
    newFocusedColumnAriaColindex: null,
    newFocusedColumn: null,
  };
};

export type OnColumnFocused = ({
  newFocusedColumn,
  newFocusedColumnAriaColindex,
}: {
  newFocusedColumn: HTMLDivElement | null;
  newFocusedColumnAriaColindex: number | null;
}) => void;

export const getRowRendererClassName = (ariaRowindex: number) =>
  `${ROW_RENDERER_CLASS_NAME}-${ariaRowindex}`;

export const getNotesContainerClassName = (ariaRowindex: number) =>
  `${NOTES_CONTAINER_CLASS_NAME}-${ariaRowindex}`;

/**
 * This function implements arrow key support for the `onKeyDownFocusHandler`.
 *
 * See the `Keyboard Support` section of
 * https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 * for details
 */
export const onArrowKeyDown = ({
  colindexAttribute,
  containerElement,
  event,
  focusedAriaColindex,
  focusedAriaRowindex,
  maxAriaColindex,
  maxAriaRowindex,
  onColumnFocused,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: HTMLElement | null;
  event: React.KeyboardEvent;
  focusedAriaColindex: number;
  focusedAriaRowindex: number;
  maxAriaColindex: number;
  maxAriaRowindex: number;
  onColumnFocused?: OnColumnFocused;
  rowindexAttribute: string;
}) => {
  if (isArrowDown(event) && event.shiftKey) {
    const firstRowRendererDraggable = containerElement?.querySelector<HTMLDivElement>(
      `.${getRowRendererClassName(focusedAriaRowindex)} .${DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}`
    );

    if (firstRowRendererDraggable) {
      firstRowRendererDraggable.focus();
      return;
    }
  }

  if (isArrowRight(event) && event.shiftKey) {
    const firstNoteContent = containerElement?.querySelector<HTMLDivElement>(
      `.${getNotesContainerClassName(focusedAriaRowindex)} .${NOTE_CONTENT_CLASS_NAME}`
    );

    if (firstNoteContent) {
      firstNoteContent.focus();
      return;
    }
  }

  const ariaColindex = isArrowRightOrArrowLeft(event)
    ? getNewAriaColindex({
        focusedAriaColindex,
        focusOn: getFocusOnFromArrowKey(event),
        maxAriaColindex,
      })
    : focusedAriaColindex;

  const ariaRowindex = isArrowDownOrArrowUp(event)
    ? getNewAriaRowindex({
        focusedAriaRowindex,
        focusOn: getFocusOnFromArrowKey(event),
        maxAriaRowindex,
      })
    : focusedAriaRowindex;

  const { newFocusedColumn, newFocusedColumnAriaColindex } = focusColumn({
    ariaColindex,
    ariaRowindex,
    colindexAttribute,
    containerElement,
    rowindexAttribute,
  });

  if (onColumnFocused != null && newFocusedColumnAriaColindex != null) {
    onColumnFocused({ newFocusedColumn, newFocusedColumnAriaColindex });
  }
};

/**
 * This function implements `home` and `end` key support for the `onKeyDownFocusHandler`.
 *
 * See the `Keyboard Support` section of
 * https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 * for details
 */
export const onHomeEndDown = ({
  colindexAttribute,
  containerElement,
  event,
  focusedAriaRowindex,
  maxAriaColindex,
  maxAriaRowindex,
  onColumnFocused,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: HTMLElement | null;
  event: React.KeyboardEvent;
  focusedAriaRowindex: number;
  maxAriaColindex: number;
  maxAriaRowindex: number;
  onColumnFocused?: OnColumnFocused;
  rowindexAttribute: string;
}) => {
  const ariaColindex = isHome(event) ? FIRST_ARIA_INDEX : maxAriaColindex;

  const ariaRowindex = event.ctrlKey
    ? getFirstOrLastAriaRowindex({ event, maxAriaRowindex })
    : focusedAriaRowindex;

  const { newFocusedColumn, newFocusedColumnAriaColindex } = focusColumn({
    ariaColindex,
    ariaRowindex,
    colindexAttribute,
    containerElement,
    rowindexAttribute,
  });

  if (isHome(event) && event.ctrlKey) {
    containerElement?.scrollTo(0, 0);
  }

  if (onColumnFocused != null && newFocusedColumnAriaColindex != null) {
    onColumnFocused({ newFocusedColumn, newFocusedColumnAriaColindex });
  }
};

/** Returns `true` if the specified row is completely visible in the container */
const isRowCompletelyScrolledIntoView = ({
  container,
  row,
}: {
  container: DOMRect;
  row: HTMLDivElement;
}) => {
  const rect = row.getBoundingClientRect();
  const top = rect.top;
  const bottom = rect.bottom;

  return top >= container.top && bottom <= container.bottom;
};

export const getFirstNonVisibleAriaRowindex = ({
  focusedAriaRowindex,
  element,
  event,
  maxAriaRowindex,
  rowindexAttribute,
}: {
  focusedAriaRowindex: number;
  element: HTMLDivElement | null;
  event: React.KeyboardEvent;
  maxAriaRowindex: number;
  rowindexAttribute: string;
}): number => {
  const defaultAriaRowindex = isPageUp(event) ? FIRST_ARIA_INDEX : maxAriaRowindex; // default to the first or last row

  if (element === null) {
    return defaultAriaRowindex;
  }

  const container = element.getBoundingClientRect();
  const rows = Array.from(element.querySelectorAll<HTMLDivElement>(`[${rowindexAttribute}]`) ?? []);

  if (isPageUp(event)) {
    return arrayIndexToAriaIndex(
      rows.reduceRight(
        (found, row, i) =>
          i < ariaIndexToArrayIndex(focusedAriaRowindex) &&
          found === ariaIndexToArrayIndex(defaultAriaRowindex) &&
          !isRowCompletelyScrolledIntoView({ container, row })
            ? i
            : found,
        ariaIndexToArrayIndex(defaultAriaRowindex)
      )
    );
  } else if (isPageDown(event)) {
    return arrayIndexToAriaIndex(
      rows.reduce(
        (found, row, i) =>
          i > ariaIndexToArrayIndex(focusedAriaRowindex) &&
          found === ariaIndexToArrayIndex(defaultAriaRowindex) &&
          !isRowCompletelyScrolledIntoView({ container, row })
            ? i
            : found,
        ariaIndexToArrayIndex(defaultAriaRowindex)
      )
    );
  } else {
    return defaultAriaRowindex;
  }
};

/**
 * This function implements `page down` and `page up` key support for the `onKeyDownFocusHandler`.
 *
 * See the `Keyboard Support` section of
 * https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 * for details
 */
export const onPageDownOrPageUp = ({
  colindexAttribute,
  containerElement,
  event,
  focusedAriaColindex,
  focusedAriaRowindex,
  maxAriaRowindex,
  onColumnFocused,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: HTMLDivElement | null;
  event: React.KeyboardEvent;
  focusedAriaColindex: number;
  focusedAriaRowindex: number;
  maxAriaRowindex: number;
  onColumnFocused?: OnColumnFocused;
  rowindexAttribute: string;
}) => {
  const ariaRowindex = getFirstNonVisibleAriaRowindex({
    element: containerElement,
    event,
    focusedAriaRowindex,
    maxAriaRowindex,
    rowindexAttribute,
  });

  const { newFocusedColumn, newFocusedColumnAriaColindex } = focusColumn({
    ariaColindex: focusedAriaColindex,
    ariaRowindex,
    colindexAttribute,
    containerElement,
    rowindexAttribute,
  });

  if (onColumnFocused != null) {
    onColumnFocused({ newFocusedColumn, newFocusedColumnAriaColindex });
  }
};

/**
 * This function has side effects: It stops propagation of the provided
 * `KeyboardEvent` and prevents the browser's default behavior.
 */
export const stopPropagationAndPreventDefault = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

/**
 * This function adds keyboard accessability to any `containerElement` that
 * renders its rows with support for `aria-colindex` and `aria-rowindex`.
 *
 * To use this function, invoke it in the `onKeyDown` handler of the specified
 * `containerElement`.
 *
 * See the `Keyboard Support` section of
 * https://www.w3.org/TR/wai-aria-practices-1.1/examples/grid/dataGrids.html
 * for details of the behavior.
 */
export const onKeyDownFocusHandler = ({
  colindexAttribute,
  containerElement,
  event,
  maxAriaColindex,
  maxAriaRowindex,
  onColumnFocused,
  rowindexAttribute,
}: {
  colindexAttribute: string;
  containerElement: HTMLDivElement | null;
  event: React.KeyboardEvent;
  maxAriaColindex: number;
  maxAriaRowindex: number;
  onColumnFocused: OnColumnFocused;
  rowindexAttribute: string;
}) => {
  // NOTE: When a row has focus, but none of the columns in that row have focus
  // because, for example, the row renderer contained by the row has focus, we
  // default `focusedAriaColindex` to be the first non-action column:
  const focusedAriaColindex =
    getColindex({
      colindexAttribute,
      element: getFocusedColumn({ colindexAttribute, element: containerElement }),
    }) ?? FIRST_ARIA_INDEX;
  const focusedAriaRowindex = getRowindex({
    rowindexAttribute,
    element: getFocusedRow({
      rowindexAttribute,
      element: containerElement,
    }),
  });

  if (focusedAriaColindex != null && focusedAriaRowindex != null) {
    if (isArrowKey(event)) {
      stopPropagationAndPreventDefault(event);

      onArrowKeyDown({
        colindexAttribute,
        containerElement,
        event,
        focusedAriaColindex,
        focusedAriaRowindex,
        maxAriaColindex,
        maxAriaRowindex,
        onColumnFocused,
        rowindexAttribute,
      });
    } else if (isHomeOrEnd(event)) {
      stopPropagationAndPreventDefault(event);

      onHomeEndDown({
        colindexAttribute,
        containerElement,
        event,
        focusedAriaRowindex,
        maxAriaColindex,
        maxAriaRowindex,
        onColumnFocused,
        rowindexAttribute,
      });
    } else if (isPageDownOrPageUp(event)) {
      stopPropagationAndPreventDefault(event);

      onPageDownOrPageUp({
        colindexAttribute,
        containerElement,
        event,
        focusedAriaColindex,
        focusedAriaRowindex,
        maxAriaRowindex,
        onColumnFocused,
        rowindexAttribute,
      });
    }
  }
};

/** Returns `true` when the element, or one of it's children has focus */
export const elementOrChildrenHasFocus = (element: HTMLElement | null | undefined): boolean =>
  element === document.activeElement || element?.querySelector(':focus-within') != null;

export type FocusableElement =
  | HTMLAnchorElement
  | HTMLAreaElement
  | HTMLAudioElement
  | HTMLButtonElement
  | HTMLDivElement
  | HTMLFormElement
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
  | HTMLVideoElement;

/**
 * Returns a table cell's focusable children, which may be one of the following
 * a) a `HTMLButtonElement` that does NOT have the `disabled` attribute
 * b) an element with the `DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME`
 */
export const getFocusableChidren = (cell: HTMLElement | null) =>
  Array.from<FocusableElement>(
    cell?.querySelectorAll(
      `button:not([disabled]), button:not([tabIndex="-1"]), .${DRAGGABLE_KEYBOARD_WRAPPER_CLASS_NAME}`
    ) ?? []
  );

export type SKIP_FOCUS_BACKWARDS = 'SKIP_FOCUS_BACKWARDS';
export type SKIP_FOCUS_FORWARD = 'SKIP_FOCUS_FORWARD';
export type SKIP_FOCUS_NOOP = 'SKIP_FOCUS_NOOP';
export type SkipFocus = SKIP_FOCUS_BACKWARDS | SKIP_FOCUS_FORWARD | SKIP_FOCUS_NOOP;

/**
 * If the value of `skipFocus` is `SKIP_FOCUS_BACKWARDS` or `SKIP_FOCUS_FORWARD`
 * this function will invoke the provided `onSkipFocusBackwards` or
 * `onSkipFocusForward` functions respectively.
 *
 * If `skipFocus` is `SKIP_FOCUS_NOOP`, the `onSkipFocusBackwards` and
 * `onSkipFocusForward` functions will not be invoked.
 */
export const handleSkipFocus = ({
  onSkipFocusBackwards,
  onSkipFocusForward,
  skipFocus,
}: {
  onSkipFocusBackwards: () => void;
  onSkipFocusForward: () => void;
  skipFocus: SkipFocus;
}): void => {
  switch (skipFocus) {
    case 'SKIP_FOCUS_BACKWARDS':
      onSkipFocusBackwards();
      break;
    case 'SKIP_FOCUS_FORWARD':
      onSkipFocusForward();
      break;
    case 'SKIP_FOCUS_NOOP': // fall through to the default, which does nothing
    default:
      break;
  }
};

/**
 * The provided `focusedCell` may contain multiple focusable children. For,
 * example, the cell may contain multiple `HTMLButtonElement`s that represent
 * actions, or the cell may contain multiple draggables.
 *
 * This function returns `true` when there are still more children of the cell
 * that should receive focus when the tab key is pressed.
 *
 * When this function returns `true`, the caller should NOT move focus away
 * from the table. Instead, the browser's "natural" focus management should be
 * allowed to automatically focus the next (or previous) focusable child of the
 * cell.
 */
export const focusedCellHasMoreFocusableChildren = ({
  focusedCell,
  shiftKey,
}: {
  focusedCell: HTMLElement | null;
  shiftKey: boolean;
}): boolean => {
  const focusableChildren = getFocusableChidren(focusedCell);

  if (focusableChildren.length === 0) {
    return false; // there no children to focus
  }

  const firstOrLastChild = shiftKey
    ? focusableChildren[0]
    : focusableChildren[focusableChildren.length - 1];

  return firstOrLastChild !== document.activeElement;
};

/**
 * Returns `true` when the provided `focusedCell` has always-open hover
 * content (i.e. a hover menu)
 *
 * When this function returns true, the caller should `NOT` move focus away
 * from the table. Instead, the browser's "natural" focus management should
 * be allowed to manage focus between the table and the hover content.
 */
export const focusedCellHasAlwaysOpenHoverContent = (focusedCell: HTMLElement | null): boolean =>
  focusedCell?.querySelector<HTMLDivElement>(`.${HOVER_ACTIONS_ALWAYS_SHOW_CLASS_NAME}`) != null;

export type GetFocusedCell = ({
  containerElement,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  tableClassName: string;
}) => HTMLDivElement | null;

/**
 * Returns true if the focused cell is a plain, non-action `columnheader`
 */
export const focusedCellIsPlainColumnHeader = (focusedCell: HTMLDivElement | null): boolean =>
  focusedCell?.getAttribute('role') === 'columnheader' &&
  !focusedCell?.classList.contains('siemEventsTable__thGroupActions');

/**
 * This function, which works with tables that use the `aria-colindex` or
 * `data-colindex` attributes, examines the focus state of the table, and
 * returns a `SkipFocus` enumeration.
 *
 * The `SkipFocus` return value indicates whether the caller should skip focus
 * to "before" the table, "after" the table, or take no action, and let the
 * browser's "natural" focus management manage focus.
 */
export const getTableSkipFocus = ({
  containerElement,
  getFocusedCell,
  shiftKey,
  tableHasFocus,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  getFocusedCell: GetFocusedCell;
  shiftKey: boolean;
  tableHasFocus: (containerElement: HTMLElement | null) => boolean;
  tableClassName: string;
}): SkipFocus => {
  if (tableHasFocus(containerElement)) {
    const focusedCell = getFocusedCell({ containerElement, tableClassName });

    if (focusedCell == null) {
      return 'SKIP_FOCUS_NOOP'; // no cells have focus, often because something with a `dialog` role has focus
    }

    if (
      focusedCellHasMoreFocusableChildren({ focusedCell, shiftKey }) &&
      !focusedCellIsPlainColumnHeader(focusedCell)
    ) {
      return 'SKIP_FOCUS_NOOP'; // the focused cell still has focusable children
    }

    if (focusedCellHasAlwaysOpenHoverContent(focusedCell)) {
      return 'SKIP_FOCUS_NOOP'; // the focused cell has always-open hover content
    }

    return shiftKey ? 'SKIP_FOCUS_BACKWARDS' : 'SKIP_FOCUS_FORWARD'; // the caller should skip focus "before" or "after" the table
  }

  return 'SKIP_FOCUS_NOOP'; // the table does NOT have focus
};

/**
 * Returns the focused cell for tables that use `aria-colindex`
 */
export const getFocusedAriaColindexCell: GetFocusedCell = ({
  containerElement,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  tableClassName: string;
}): HTMLDivElement | null =>
  containerElement?.querySelector<HTMLDivElement>(
    `.${tableClassName} [aria-colindex]:focus-within`
  ) ?? null;

/**
 * Returns the focused cell for tables that use `data-colindex`
 */
export const getFocusedDataColindexCell: GetFocusedCell = ({
  containerElement,
  tableClassName,
}: {
  containerElement: HTMLElement | null;
  tableClassName: string;
}): HTMLDivElement | null =>
  containerElement?.querySelector<HTMLDivElement>(
    `.${tableClassName} [data-colindex]:focus-within`
  ) ?? null;
