/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISMISS_REASON_LABELS, formatDismissReason } from './dismiss_reason';

describe('formatDismissReason', () => {
  it('shows only the rationale when no reason was selected', () => {
    expect(formatDismissReason('no_reason', 'Flag already off')).toBe('Flag already off');
  });

  it('keeps the "no reason" label when there is no rationale', () => {
    expect(formatDismissReason('no_reason')).toBe(DISMISS_REASON_LABELS.no_reason);
    expect(formatDismissReason('no_reason', '')).toBe(DISMISS_REASON_LABELS.no_reason);
  });

  it('treats a whitespace-only rationale as absent', () => {
    expect(formatDismissReason('no_reason', '   ')).toBe(DISMISS_REASON_LABELS.no_reason);
    expect(formatDismissReason('handled_elsewhere', '  \n ')).toBe(
      DISMISS_REASON_LABELS.handled_elsewhere
    );
  });

  it('shows the label alone for a selected reason without a rationale', () => {
    expect(formatDismissReason('handled_elsewhere')).toBe('Handled elsewhere');
  });

  it('prefixes the label to the rationale for a selected reason', () => {
    expect(formatDismissReason('handled_elsewhere', 'Fixed in #123')).toBe(
      'Handled elsewhere — Fixed in #123'
    );
  });
});
