/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { EuiPopoverProps } from '@elastic/eui';

export interface LifecycleTimelineAge {
  /** Shown under the track as set, for example "7d". */
  label: string;
  /** Used for the width of the periods. */
  valueInMs: number;
}

export interface LifecycleTimelinePeriod {
  id: string;
  label: string;
  /**
   * Background of the bar, as a hex, rgb or named color. The text color is picked to contrast with it.
   * Other values, like CSS variables, get the default text color.
   */
  color: string;
  /** Leave it out for a period with no end. The period starts where the one before it ends. */
  maxAge?: LifecycleTimelineAge;
  /** Data volume shown below the name, already formatted. */
  size?: string;
  /**
   * Details shown below the name in a tooltip on hover or focus. The bar becomes focusable.
   * Can be combined with `popoverContent` and `onClick`: the tooltip hides while the popover is open.
   */
  tooltipContent?: ReactNode;
  /** Content of a popover opened by clicking the bar. A function gets `closePopover`, for actions inside it. */
  popoverContent?: ReactNode | ((api: { closePopover: () => void }) => ReactNode);
  /** Panel settings for content with its own title and footer. */
  popoverProps?: Pick<EuiPopoverProps, 'panelPaddingSize' | 'aria-labelledby'>;
  onClick?: () => void;
  /** Outlines the bar, for example while the period is being edited. It is also outlined while its popover is open. */
  isHighlighted?: boolean;
  /**
   * Replace the default test subjects: `{prefix}-period-{id}` and its `-name` and `-size`.
   * `name` and `size` left out are derived from `bar`.
   */
  testSubjects?: { bar?: string; name?: string; size?: string };
}

/** Columns of a timeline row. Rows of the same timeline can use different grids. */
export interface LifecycleTimelineGrid {
  gridTemplateColumns: string;
  /** Columns used instead when the closest `LifecycleTimelineContainer` is at most `maxWidthPx` wide. */
  narrow?: { maxWidthPx: number; gridTemplateColumns: string };
  /** The row doesn't shrink below this width, so the container scrolls sideways. */
  minWidth?: string;
}

export interface LifecycleTimelineTrackItem {
  period: LifecycleTimelinePeriod;
  /** Where the period starts and ends, read by screen readers. */
  startLabel: string;
  endLabel: string;
  /** CSS `grid-column` of the bar, for grids with more columns than periods. */
  gridColumn?: string;
}

export interface LifecycleTimelineEndLabel {
  label: string;
  /** Centers the label on the last line. Other labels sit inside the end, so they don't overflow. */
  isInfinite?: boolean;
  /** Replaces the default test subject, `{prefix}-retention`. */
  'data-test-subj'?: string;
}

export interface LifecycleTimelineTick {
  id: string;
  /** Shown where the column starts. */
  label: string;
  /** Shows the label in the danger color and adds `-invalid` to its default test subject. */
  isInvalid?: boolean;
  /** Replaces the default test subject of the label, `{prefix}-tick-{id}`. */
  'data-test-subj'?: string;
  /** CSS `grid-column` of the tick, for grids with more columns than ticks. */
  gridColumn?: string;
}
