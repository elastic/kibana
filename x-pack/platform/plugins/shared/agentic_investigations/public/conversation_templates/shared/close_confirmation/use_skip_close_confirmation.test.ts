/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { InvestigationClosePreviewResponse } from '../../../../common';
import { useSkipCloseConfirmation } from './use_skip_close_confirmation';

const preview = (
  overrides: Partial<InvestigationClosePreviewResponse> = {}
): InvestigationClosePreviewResponse => ({
  pending_proposal_count: 0,
  pending_proposals: [],
  requires_discard_reason: false,
  running_proposal_count: 0,
  ...overrides,
});

describe('useSkipCloseConfirmation', () => {
  it('shows nothing, and closes nothing, while the preview is loading', () => {
    const confirm = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useSkipCloseConfirmation({ preview: undefined, confirm }));

    expect(result.current.isSkipped).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('falls back to the modal when the preview could not be loaded', () => {
    const confirm = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useSkipCloseConfirmation({ preview: undefined, loadError: true, confirm })
    );

    expect(result.current.isSkipped).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('confirms the close itself when no pending proposal needs a reason', async () => {
    const confirm = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useSkipCloseConfirmation({ preview: preview(), confirm }));

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(result.current.isSkipped).toBe(true);
  });

  it('leaves the confirmation to the user when a pending proposal needs a reason', () => {
    const confirm = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useSkipCloseConfirmation({
        preview: preview({ requires_discard_reason: true, pending_proposal_count: 1 }),
        confirm,
      })
    );

    expect(result.current.isSkipped).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('reveals the confirmation when the close it tried was rejected', async () => {
    const confirm = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useSkipCloseConfirmation({ preview: preview(), confirm }));

    await waitFor(() => expect(result.current.isSkipped).toBe(false));
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('closes once even though the preview keeps refetching', async () => {
    const confirm = jest.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ data }) => useSkipCloseConfirmation({ preview: data, confirm }),
      { initialProps: { data: preview() } }
    );

    rerender({ data: preview() });
    rerender({ data: preview({ running_proposal_count: 1 }) });

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  });
});
