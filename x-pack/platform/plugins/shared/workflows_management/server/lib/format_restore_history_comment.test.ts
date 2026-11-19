/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRestoreHistoryComment } from './format_restore_history_comment';

describe('formatRestoreHistoryComment', () => {
  it('formats a versioned restore comment', () => {
    expect(formatRestoreHistoryComment(3)).toBe('Restored from v3');
  });

  it('formats a fallback when the source sequence is unknown', () => {
    expect(formatRestoreHistoryComment()).toBe('Restored from a previous version');
  });
});
