/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LifecycleTimelineEndLabel,
  LifecycleTimelineGrid,
  LifecycleTimelinePeriod,
  LifecycleTimelineTick,
  LifecycleTimelineTrackItem,
} from './types';

const MIN_PERIOD_WIDTH_PX = 96;
// Below this width per period, periods share the width equally.
const PROPORTIONAL_MIN_WIDTH_PER_PERIOD_PX = MIN_PERIOD_WIDTH_PX * 1.5;

const FIRST_START_LABEL = '0';
const INFINITE_RETENTION_LABEL = '∞';

export interface LifecycleTimelineLayoutPeriod extends LifecycleTimelineTrackItem {
  /** Width relative to the other periods. */
  grow: number;
}

export interface LifecycleTimelineLayout {
  periods: LifecycleTimelineLayoutPeriod[];
  /** One tick where each period starts. */
  ticks: LifecycleTimelineTick[];
  /** The retention, or "∞". */
  endLabel: LifecycleTimelineEndLabel;
  /** Widths proportional to each period's age range, the same for all in narrow containers. */
  grid: LifecycleTimelineGrid;
}

export const getLifecycleTimelineLayout = (
  periods: LifecycleTimelinePeriod[],
  retention?: string
): LifecycleTimelineLayout => {
  const visible: Array<{ period: LifecycleTimelinePeriod; startLabel: string; range: number }> = [];
  let startMs = 0;
  let startLabel = FIRST_START_LABEL;

  for (const period of periods) {
    const endMs = period.maxAge?.valueInMs ?? Infinity;
    if (Number.isNaN(endMs) || endMs <= startMs) continue;

    visible.push({ period, startLabel, range: endMs - startMs });
    if (!period.maxAge) break;

    startMs = endMs;
    startLabel = period.maxAge.label;
  }

  const finiteRanges = visible.map(({ range }) => range).filter(Number.isFinite);
  const maxRange = finiteRanges.length > 0 ? Math.max(...finiteRanges) : 1;
  const endLabel: LifecycleTimelineEndLabel =
    retention === undefined
      ? { label: INFINITE_RETENTION_LABEL, isInfinite: true }
      : { label: retention };

  const layoutPeriods = visible.reduce<LifecycleTimelineLayoutPeriod[]>(
    (acc, { period, startLabel: periodStartLabel, range }, index) => {
      const isLast = index === visible.length - 1;
      // A period with no end is as wide as the one before it.
      const grow = Number.isFinite(range) ? range / maxRange : acc[index - 1]?.grow ?? 1;

      acc.push({
        period,
        startLabel: periodStartLabel,
        endLabel: isLast ? endLabel.label : visible[index + 1].startLabel,
        grow,
      });
      return acc;
    },
    []
  );

  const count = layoutPeriods.length;

  return {
    periods: layoutPeriods,
    ticks: layoutPeriods.map(({ period, startLabel: label }) => ({ id: period.id, label })),
    endLabel,
    grid: {
      gridTemplateColumns: layoutPeriods
        .map(({ grow }) => `minmax(${MIN_PERIOD_WIDTH_PX}px, ${grow}fr)`)
        .join(' '),
      narrow: {
        maxWidthPx: count * PROPORTIONAL_MIN_WIDTH_PER_PERIOD_PX,
        gridTemplateColumns: `repeat(${count}, minmax(${MIN_PERIOD_WIDTH_PX}px, 1fr))`,
      },
      minWidth: `${count * MIN_PERIOD_WIDTH_PX}px`,
    },
  };
};
