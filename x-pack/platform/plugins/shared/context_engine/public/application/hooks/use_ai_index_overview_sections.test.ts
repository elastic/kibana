/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useFeedbackLoopEnabled } from './use_feedback_loop_enabled';
import { useAiIndexOverviewSections } from './use_ai_index_overview_sections';
import { useSignalGroups } from './use_signal_groups';

jest.mock('./use_feedback_loop_enabled', () => ({
  useFeedbackLoopEnabled: jest.fn(() => true),
}));

jest.mock('./use_signal_groups', () => ({
  useSignalGroups: jest.fn(() => ({
    groups: [],
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
  })),
}));

const mockUseFeedbackLoopEnabled = jest.mocked(useFeedbackLoopEnabled);
const mockUseSignalGroups = jest.mocked(useSignalGroups);

const baseIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

describe('useAiIndexOverviewSections', () => {
  beforeEach(() => {
    mockUseFeedbackLoopEnabled.mockReturnValue(true);
    mockUseSignalGroups.mockReturnValue({
      groups: [],
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('locks downstream sections when setup is empty', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ aiIndex: baseIndex, isLoading: false })
    );

    expect(result.current).toEqual({
      hideEditControls: false,
      showAutomationsPanel: false,
      showSignalsSection: true,
      showSignalsPanel: false,
    });
  });

  it('shows automations when sources exist', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({
        aiIndex: { ...baseIndex, sources: [{ type: 'esql', value: 'FROM logs-*' }] },
        isLoading: false,
      })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showSignalsPanel).toBe(false);
  });

  it('keeps automations visible when sources are cleared but automations remain', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({
        aiIndex: {
          ...baseIndex,
          sources: [],
          automations: [{ type: 'workflow', value: 'wf-1' }],
        },
        isLoading: false,
      })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showSignalsPanel).toBe(true);
  });

  it('shows signals when signal groups exist even without automations', () => {
    mockUseSignalGroups.mockReturnValue({
      groups: [{ tag: 'missing-context', count: 2 }],
      isLoading: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ aiIndex: baseIndex, isLoading: false })
    );

    expect(result.current.showAutomationsPanel).toBe(false);
    expect(result.current.showSignalsPanel).toBe(true);
  });

  it('bypasses setup locks for managed AI indexes', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({
        aiIndex: { ...baseIndex, managed: true },
        isLoading: false,
      })
    );

    expect(result.current).toEqual({
      hideEditControls: true,
      showAutomationsPanel: true,
      showSignalsSection: true,
      showSignalsPanel: true,
    });
  });

  it('hides the signals section when the feedback loop is disabled', () => {
    mockUseFeedbackLoopEnabled.mockReturnValue(false);

    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ aiIndex: baseIndex, isLoading: false })
    );

    expect(result.current.showSignalsSection).toBe(false);
  });

  it('shows real panels while loading to avoid locked-state flash', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ aiIndex: undefined, isLoading: true })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showSignalsPanel).toBe(true);
    expect(result.current.showSignalsSection).toBe(true);
    expect(result.current.hideEditControls).toBe(true);
  });
});
