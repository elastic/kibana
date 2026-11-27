/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntryLabelBox, TimeWindow, TimelineEntry } from '.';
import { layoutEntryLabels } from '.';

const MINUTE = 60 * 1000;
const T0 = Date.parse('2026-09-01T09:00:00.000Z');
const WIDTH = 1000;
// 1000 px over 1000 minutes: one minute per pixel.
const WINDOW: TimeWindow = { startMs: T0, endMs: T0 + 1000 * MINUTE };
const measure = (text: string) => text.length * 7;

const entry = (id: string, minute: number, title = `Entry ${id}`): TimelineEntry => ({
  id,
  version: 'v1',
  category: 'internal',
  occurredMs: T0 + minute * MINUTE,
  createdBy: 'analyst',
  data: { title, occurredAt: new Date(T0 + minute * MINUTE).toISOString() },
});

const overlaps = (a: EntryLabelBox, b: EntryLabelBox) =>
  a.level === b.level && a.left < b.left + b.width && b.left < a.left + a.width;

const expectNoOverlap = (boxes: readonly EntryLabelBox[]) => {
  boxes.forEach((box, i) => {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.left + box.width).toBeLessThanOrEqual(WIDTH);
    boxes.slice(i + 1).forEach((other) => expect(overlaps(box, other)).toBe(false));
  });
};

describe('layoutEntryLabels', () => {
  it('gives every entry in the window a label that overlaps no other label or flag', () => {
    const entries = [
      entry('same-1', 500, 'Closing update'),
      entry('same-2', 500, 'Host wiped and returned to service'),
      entry('same-3', 500, 'Lessons learned'),
      entry('near', 510, 'User pasted ClickFix command'),
      entry('far', 100, 'Phishing email delivered'),
      entry('right-edge', 995, 'Case closed by on-call'),
      entry('left-edge', 0, 'First beacon'),
    ];

    const { boxes, levels } = layoutEntryLabels(entries, WINDOW, WIDTH, measure);

    expect(boxes.map(({ entry: { id } }) => id)).toEqual([
      'left-edge',
      'far',
      'same-1',
      'same-2',
      'same-3',
      'near',
      'right-edge',
    ]);
    expectNoOverlap(boxes);
    expect(levels).toBe(4);
  });

  it('keeps entries that are far apart on the first level', () => {
    const { boxes, levels } = layoutEntryLabels(
      [entry('a', 100), entry('b', 400), entry('c', 700)],
      WINDOW,
      WIDTH,
      measure
    );
    expect(boxes.map(({ level }) => level)).toEqual([0, 0, 0]);
    expect(levels).toBe(1);
  });

  it('puts the title left of the flag when there is no room on the right', () => {
    const { boxes } = layoutEntryLabels([entry('late', 990)], WINDOW, WIDTH, measure);
    expect(boxes[0].side).toBe('left');
    expect(boxes[0].left + boxes[0].width).toBeLessThanOrEqual(WIDTH);
  });

  it('caps long titles and leaves out entries outside the window', () => {
    const { boxes } = layoutEntryLabels(
      [entry('long', 100, 'x'.repeat(160)), entry('before', -5), entry('after', 1005)],
      WINDOW,
      WIDTH,
      measure
    );
    expect(boxes.map(({ entry: { id } }) => id)).toEqual(['long']);
    expect(boxes[0].width).toBeLessThan(160 * 7);
  });

  it('uses one level when there are no entries', () => {
    expect(layoutEntryLabels([], WINDOW, WIDTH, measure)).toEqual({ boxes: [], levels: 1 });
  });
});
