/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeWindow, TimelineEntry } from './types';

/** Flag icon width; the flag is centred on the entry time. */
export const ENTRY_FLAG_PX = 16;
/** Space between the flag and its title. */
const FLAG_TEXT_GAP_PX = 4;
/** Minimum space between two labels on one level. */
const LABEL_GAP_PX = 6;
/** Longer titles are cut; the full title is in the tooltip. */
const MAX_TEXT_PX = 280;

export interface EntryLabelBox {
  readonly entry: TimelineEntry;
  /** Left edge of flag plus title, in px from the chart's left edge. */
  readonly left: number;
  /** Flag plus title, in px. */
  readonly width: number;
  /** Vertical level inside the row, 0 at the top. */
  readonly level: number;
  /** `left`: the title sits left of the flag because there is no room on the right. */
  readonly side: 'right' | 'left';
}

export interface EntryLabelLayout {
  /** One box per entry inside the window, in time order. */
  readonly boxes: readonly EntryLabelBox[];
  /** Levels used, at least 1. */
  readonly levels: number;
}

/**
 * Places every entry's flag and title inside `[0, widthPx]`, each on the first level where it
 * does not touch an earlier label, so no label or flag covers another. Titles go right of the
 * flag, left of it near the right edge.
 */
export const layoutEntryLabels = (
  entries: readonly TimelineEntry[],
  window: TimeWindow,
  widthPx: number,
  measureText: (text: string) => number
): EntryLabelLayout => {
  const pxPerMs = widthPx / Math.max(window.endMs - window.startMs, 1);
  const levelEnds: number[] = [];

  const boxes = entries
    .filter(({ occurredMs }) => occurredMs >= window.startMs && occurredMs <= window.endMs)
    .sort((a, b) => a.occurredMs - b.occurredMs)
    .map((entry): EntryLabelBox => {
      const x = (entry.occurredMs - window.startMs) * pxPerMs;
      const wanted =
        ENTRY_FLAG_PX +
        FLAG_TEXT_GAP_PX +
        Math.min(Math.ceil(measureText(entry.data.title)), MAX_TEXT_PX);
      const roomRight = widthPx - (x - ENTRY_FLAG_PX / 2);
      const roomLeft = x + ENTRY_FLAG_PX / 2;
      const side = wanted <= roomRight || roomRight >= roomLeft ? 'right' : 'left';
      const width = Math.min(wanted, widthPx, side === 'right' ? roomRight : roomLeft);
      const unclamped = side === 'right' ? x - ENTRY_FLAG_PX / 2 : x + ENTRY_FLAG_PX / 2 - width;
      const left = Math.min(Math.max(unclamped, 0), widthPx - width);

      let level = levelEnds.findIndex((end) => end + LABEL_GAP_PX <= left);
      if (level === -1) {
        level = levelEnds.length;
        levelEnds.push(left + width);
      } else {
        levelEnds[level] = left + width;
      }
      return { entry, left, width, level, side };
    });

  return { boxes, levels: Math.max(levelEnds.length, 1) };
};
