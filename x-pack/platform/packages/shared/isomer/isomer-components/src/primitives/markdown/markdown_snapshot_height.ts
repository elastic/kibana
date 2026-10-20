/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BORDER, SIZE, TEXT, textHeight, type TextStep } from '../../lib';

/** A block's height and the vertical margins `markdownReactRenderer` gives it. */
interface Block {
  height: number;
  top: number;
  bottom: number;
}

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const TABLE_ROW = /^\s*\|/;
const TABLE_RULE = /^\s*\|?\s*:?-{3,}/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

const HEADING_TEXT: Record<number, TextStep> = {
  1: TEXT.xxl,
  2: TEXT.xl,
  3: TEXT.l,
  4: TEXT.m,
  5: TEXT.s,
  6: TEXT.xs,
};

// Drops link targets and emphasis markers, which take no width.
const plain = (line: string): string =>
  line.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*\*|__|`|~~/g, '');

const paragraph = (text: string, inset = 0): Block => ({
  height: textHeight(plain(text), TEXT.m, inset),
  top: 0,
  bottom: TEXT.m.lineHeight,
});

const toBlocks = (text: string): Block[] => {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let index = 0;
  const takeWhile = (test: (line: string) => boolean): string[] => {
    const taken: string[] = [];
    while (index < lines.length && test(lines[index])) {
      taken.push(lines[index]);
      index++;
    }
    return taken;
  };

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      index++;
    } else if (FENCE.test(line)) {
      index++;
      const code = takeWhile((next) => !FENCE.test(next));
      index++;
      blocks.push({
        height: code.length * TEXT.s.lineHeight + 2 * SIZE.s,
        top: 0,
        bottom: TEXT.m.fontSize,
      });
    } else if (HEADING.test(line)) {
      index++;
      const [, depth, heading] = HEADING.exec(line) ?? [];
      blocks.push({
        height: textHeight(plain(heading), HEADING_TEXT[depth.length]),
        top: depth.length > 1 ? SIZE.l : 0,
        bottom: SIZE.m,
      });
    } else if (RULE.test(line)) {
      index++;
      blocks.push({ height: BORDER.thin, top: SIZE.base, bottom: SIZE.base });
    } else if (LIST_ITEM.test(line)) {
      const items = takeWhile((next) => LIST_ITEM.test(next));
      blocks.push({
        height: items.reduce(
          (height, item) =>
            height +
            textHeight(plain(LIST_ITEM.exec(item)?.[1] ?? item), TEXT.m, TEXT.m.lineHeight),
          0
        ),
        top: 0,
        bottom: TEXT.m.lineHeight,
      });
    } else if (TABLE_ROW.test(line)) {
      // The snapshot renderer draws this pack's `display: block` Markdown table one cell per row.
      const cells = takeWhile((next) => TABLE_ROW.test(next))
        .filter((row) => !TABLE_RULE.test(row))
        .reduce(
          (count, row) =>
            count +
            row
              .trim()
              .replace(/^\||\|$/g, '')
              .split('|').length,
          0
        );
      const cellHeight = TEXT.m.lineHeight + TEXT.m.fontSize / 2 + 3 * BORDER.thin;
      blocks.push({ height: cells * cellHeight, top: 0, bottom: TEXT.m.fontSize });
    } else if (QUOTE.test(line)) {
      const quoted = takeWhile((next) => QUOTE.test(next)).map(
        (next) => QUOTE.exec(next)?.[1] ?? next
      );
      const inner = paragraph(quoted.join(' '), 2 * TEXT.m.fontSize + TEXT.m.fontSize / 4);
      blocks.push({ height: inner.height + inner.bottom, top: 0, bottom: TEXT.m.fontSize });
    } else {
      const prose = takeWhile(
        (next) =>
          next.trim() !== '' &&
          ![FENCE, HEADING, LIST_ITEM, TABLE_ROW, QUOTE, RULE].some((pattern) => pattern.test(next))
      );
      blocks.push(paragraph(prose.join(' ')));
    }
  }
  return blocks;
};

/** The card height of `text` as `markdownReactRenderer` lays it out: adjacent margins collapse, and the last block's bottom margin is dropped. */
export const markdownSnapshotHeight = (text: string): number =>
  toBlocks(text).reduce(
    (height, block, index, blocks) =>
      height +
      block.height +
      (index === blocks.length - 1 ? 0 : Math.max(block.bottom, blocks[index + 1].top)),
    0
  );
