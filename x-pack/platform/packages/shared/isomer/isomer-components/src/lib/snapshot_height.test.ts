/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CARD_FALLBACK_NODE_HEIGHT,
  cardContentWidth,
  createKibanaCardFrame,
} from '@kbn/isomer-theme';
import { TEXT, bodyNodeHeight, snapshotMetrics, textHeight, wrappedLines } from './snapshot_height';

describe('wrappedLines', () => {
  it('counts a short line once and keeps line breaks', () => {
    expect(wrappedLines('Healthy.', TEXT.m.fontSize)).toBe(1);
    expect(wrappedLines('one\ntwo\nthree', TEXT.m.fontSize)).toBe(3);
  });

  it('wraps a line wider than the card, and sooner when inset', () => {
    const line = 'x'.repeat(200);

    expect(wrappedLines(line, TEXT.m.fontSize)).toBeGreaterThan(1);
    expect(wrappedLines(line, TEXT.m.fontSize, cardContentWidth() / 2)).toBeGreaterThan(
      wrappedLines(line, TEXT.m.fontSize)
    );
  });

  it('wraps at the width of the card being estimated', () => {
    const line = 'x'.repeat(200);
    const lines = (width: number): number => {
      let counted = 0;
      createKibanaCardFrame({ width }).estimateHeight(
        { body: [{ type: 'probe' }] },
        {
          renderSnapshot: () => null,
          estimateSnapshotHeight: () => {
            counted = wrappedLines(line, TEXT.m.fontSize);
            return 0;
          },
        }
      );
      return counted;
    };

    expect(lines(320)).toBeGreaterThan(lines(760));
    expect(lines(760)).toBe(wrappedLines(line, TEXT.m.fontSize));
  });

  it('sets lines at the step line height', () => {
    expect(textHeight('one\ntwo', TEXT.s)).toBe(2 * TEXT.s.lineHeight);
  });
});

describe('bodyNodeHeight', () => {
  it('uses the height a primitive registered for its type', () => {
    const node = { type: 'testSized', size: 40 };
    snapshotMetrics<typeof node>('testSized', ({ size }) => size);

    expect(bodyNodeHeight(node)).toBe(40);
  });

  it('falls back to the card default for a type this pack does not define', () => {
    expect(bodyNodeHeight({ type: 'elsewhere' })).toBe(CARD_FALLBACK_NODE_HEIGHT);
  });
});
