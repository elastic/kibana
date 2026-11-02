/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  ALERT_CLOSING_REASON_PANEL_ID,
  useBulkClosingReasonItems,
} from './use_bulk_closing_reason_items';

describe('useBulkClosingReasonItems', () => {
  it('returns one item and one panel when enabled', () => {
    const { result } = renderHook(() =>
      useBulkClosingReasonItems({
        isEnabled: true,
      })
    );

    expect(result.current.item?.panel).toBe(ALERT_CLOSING_REASON_PANEL_ID);
    expect(result.current.panels.length).toBe(1);
  });

  it('returns no item and no panels when disabled', () => {
    const { result } = renderHook(() =>
      useBulkClosingReasonItems({
        isEnabled: false,
      })
    );

    expect(result.current.item).toBeUndefined();
    expect(result.current.panels).toEqual([]);
  });
});
