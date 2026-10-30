/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChangeHistoryUnifiedDiffLayoutStyles,
  CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR,
  CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR,
} from './change_history_unified_diff_layout';

describe('change_history_unified_diff_layout', () => {
  it('keeps unified diff gutter-collapse selectors stable', () => {
    expect(CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR).toBe(
      '& .monaco-diff-editor:not(.side-by-side) .editor.original'
    );
    expect(CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR).toBe(
      '& .monaco-diff-editor:not(.side-by-side) .editor.modified'
    );
  });

  it('collapses the original pane and stretches the modified pane in unified mode', () => {
    const styles = buildChangeHistoryUnifiedDiffLayoutStyles();

    expect(styles[CHANGE_HISTORY_UNIFIED_DIFF_COLLAPSE_ORIGINAL_SELECTOR]).toMatchObject({
      width: '0 !important',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    expect(styles[CHANGE_HISTORY_UNIFIED_DIFF_STRETCH_MODIFIED_SELECTOR]).toMatchObject({
      left: '0 !important',
      width: 'auto !important',
    });
  });
});
