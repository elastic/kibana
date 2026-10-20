/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEXT } from '../../lib';
import { markdownSnapshotHeight } from './markdown_snapshot_height';

describe('markdownSnapshotHeight', () => {
  it('sizes one short paragraph as one line', () => {
    expect(markdownSnapshotHeight('There are **3** open alerts.')).toBe(TEXT.m.lineHeight);
  });

  it('separates paragraphs by a line height, with no margin after the last', () => {
    expect(markdownSnapshotHeight('One.\n\nTwo.')).toBe(3 * TEXT.m.lineHeight);
  });

  it('grows with each list item, code line and table row', () => {
    const base = markdownSnapshotHeight('- one');

    expect(markdownSnapshotHeight('- one\n- two')).toBeGreaterThan(base);
    expect(markdownSnapshotHeight('```\na\nb\n```')).toBeGreaterThan(
      markdownSnapshotHeight('```\na\n```')
    );
    expect(markdownSnapshotHeight('| a |\n| - |\n| 1 |\n| 2 |')).toBeGreaterThan(
      markdownSnapshotHeight('| a |\n| - |\n| 1 |')
    );
  });

  it('counts link text, not the link target', () => {
    expect(markdownSnapshotHeight(`[Review](https://example.com/${'x'.repeat(300)})`)).toBe(
      TEXT.m.lineHeight
    );
  });
});
