/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useStaleAttachments } from './use_stale_attachments_check';

const mockCheckStale = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { checkStale: mockCheckStale },
  }),
}));

const mockAddErrorToast = jest.fn();

jest.mock('./use_toasts', () => ({
  useToasts: () => ({ addErrorToast: mockAddErrorToast }),
}));

jest.mock('react-use/lib/useEvent', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useStaleAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddErrorToast.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call checkStale when conversationId is undefined (after debounce)', async () => {
    renderHook(() => useStaleAttachments(undefined));

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockCheckStale).not.toHaveBeenCalled();
  });

  it('calls checkStale after debounce when conversationId is set', async () => {
    mockCheckStale.mockResolvedValue({
      attachments: [
        { id: 's1', is_stale: true, type: 'text', data: { content: 'x' } },
        { id: 'f1', is_stale: false, type: 'text', data: { content: 'y' } },
      ],
    });

    const { result } = renderHook(() => useStaleAttachments('conv-1'));

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockCheckStale).toHaveBeenCalledWith('conv-1');
    expect(result.current.staleAttachments).toEqual([
      { id: 's1', type: 'text', data: { content: 'x' } },
    ]);
  });

  it('strips is_stale and origin from mapped stale attachments', async () => {
    mockCheckStale.mockResolvedValue({
      attachments: [
        {
          id: 's1',
          is_stale: true,
          type: 'custom',
          origin: 'origin-ref',
          data: { v: 1 },
        },
      ],
    });

    const { result } = renderHook(() => useStaleAttachments('conv-2'));

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current.staleAttachments).toEqual([{ id: 's1', type: 'custom', data: { v: 1 } }]);
    expect(result.current.staleAttachments[0]).not.toHaveProperty('origin');
    expect(result.current.staleAttachments[0]).not.toHaveProperty('is_stale');
  });

  it('clears stale list and re-fetches when conversationId changes', async () => {
    mockCheckStale.mockResolvedValueOnce({
      attachments: [{ id: 'a', is_stale: true, type: 'text', data: { c: '1' } }],
    });
    mockCheckStale.mockResolvedValueOnce({
      attachments: [{ id: 'b', is_stale: true, type: 'text', data: { c: '2' } }],
    });

    const { result, rerender } = renderHook(
      ({ conversationId }: { conversationId: string | undefined }) =>
        useStaleAttachments(conversationId),
      { initialProps: { conversationId: 'first' as string | undefined } }
    );

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(mockCheckStale).toHaveBeenLastCalledWith('first');
    expect(result.current.staleAttachments).toHaveLength(1);

    rerender({ conversationId: 'second' });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockCheckStale).toHaveBeenLastCalledWith('second');
    expect(result.current.staleAttachments).toEqual([{ id: 'b', type: 'text', data: { c: '2' } }]);
  });

  it('schedules another check when scheduleStaleCheck runs (debounced)', async () => {
    mockCheckStale.mockResolvedValue({
      attachments: [{ id: 'x', is_stale: true, type: 'text', data: { n: 1 } }],
    });

    const { result } = renderHook(() => useStaleAttachments('conv-x'));

    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(mockCheckStale).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.scheduleStaleCheck();
      jest.advanceTimersByTime(400);
    });

    expect(mockCheckStale).toHaveBeenCalledTimes(2);
    expect(mockCheckStale).toHaveBeenLastCalledWith('conv-x');
  });

  it('shows an error toast when the stale check returns per-attachment errors', async () => {
    mockCheckStale.mockResolvedValue({
      attachments: [
        { id: 'bad', is_stale: false, error: 'resolve failed' },
        { id: 'good', is_stale: false },
      ],
    });

    renderHook(() => useStaleAttachments('conv-err'));

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockAddErrorToast).toHaveBeenCalledTimes(1);
    expect(mockAddErrorToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.any(String),
        text: expect.stringContaining('resolve failed (attachment id: bad)'),
      })
    );
  });
});
