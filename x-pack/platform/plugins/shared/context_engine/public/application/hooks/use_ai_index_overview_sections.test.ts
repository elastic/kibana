/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useAiIndexOverviewSections } from './use_ai_index_overview_sections';

const baseIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  memory_enabled: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const baseParams = {
  aiIndex: baseIndex,
  isLoading: false,
  hasKnowledgeIndicators: false,
  isKnowledgeIndicatorsLoading: false,
};

describe('useAiIndexOverviewSections', () => {
  it('locks downstream sections and shows onboarding when setup is empty', () => {
    const { result } = renderHook(() => useAiIndexOverviewSections(baseParams));

    expect(result.current).toEqual({
      hideEditControls: false,
      showOnboardingPanel: true,
      showAutomationsPanel: false,
      showSignalsSection: false,
      showSignalsPanel: false,
    });
  });

  it('shows automations and keeps onboarding visible until knowledge indicators exist', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({
        ...baseParams,
        aiIndex: { ...baseIndex, sources: [{ type: 'esql', value: 'FROM logs-*' }] },
      })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showOnboardingPanel).toBe(true);
    expect(result.current.showSignalsPanel).toBe(false);
  });

  it('keeps automations and onboarding visible when only automations are configured', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({
        ...baseParams,
        aiIndex: {
          ...baseIndex,
          sources: [],
          automations: [{ type: 'workflow', value: 'wf-1' }],
        },
      })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showOnboardingPanel).toBe(true);
    expect(result.current.showSignalsPanel).toBe(false);
  });

  it('hides onboarding when knowledge indicators exist', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ ...baseParams, hasKnowledgeIndicators: true })
    );

    expect(result.current.showOnboardingPanel).toBe(false);
  });

  it('hides onboarding while the knowledge indicators summary is still loading', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ ...baseParams, isKnowledgeIndicatorsLoading: true })
    );

    expect(result.current.showOnboardingPanel).toBe(false);
  });

  it('bypasses setup locks for managed AI indexes', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ ...baseParams, aiIndex: { ...baseIndex, managed: true } })
    );

    expect(result.current).toEqual({
      hideEditControls: true,
      showOnboardingPanel: false,
      showAutomationsPanel: true,
      showSignalsSection: false,
      showSignalsPanel: false,
    });
  });

  it('signals section is always hidden', () => {
    const { result } = renderHook(() => useAiIndexOverviewSections(baseParams));

    expect(result.current.showSignalsSection).toBe(false);
    expect(result.current.showSignalsPanel).toBe(false);
  });

  it('shows real panels and hides onboarding while loading to avoid locked-state flash', () => {
    const { result } = renderHook(() =>
      useAiIndexOverviewSections({ ...baseParams, aiIndex: undefined, isLoading: true })
    );

    expect(result.current.showAutomationsPanel).toBe(true);
    expect(result.current.showOnboardingPanel).toBe(false);
    expect(result.current.showSignalsPanel).toBe(false);
    expect(result.current.showSignalsSection).toBe(false);
    expect(result.current.hideEditControls).toBe(true);
  });
});
