/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useAiIndexDreaming } from './use_ai_index_dreaming';
import { useMemoryCount } from './use_memory_count';
import { useSetupWizardProgress } from './use_setup_wizard_progress';

jest.mock('./use_ai_index_dreaming');
jest.mock('./use_memory_count');

const mockUseAiIndexDreaming = jest.mocked(useAiIndexDreaming);
const mockUseMemoryCount = jest.mocked(useMemoryCount);

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

describe('useSetupWizardProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMemoryCount.mockReturnValue({ memoryCount: 2, isLoading: false, isError: false });
    mockUseAiIndexDreaming.mockReturnValue({
      dreaming: { enabled: true },
      workflowIds: [],
      isLoading: false,
      isError: false,
    });
  });

  it('collects the data the steps read, retrying a failed request only once', () => {
    const { result } = renderHook(() =>
      useSetupWizardProgress({ aiIndex, isMemoryEnabled: true, isSetupWizardEnabled: true })
    );

    expect(result.current).toEqual({
      progress: { aiIndex, dreaming: { enabled: true }, memoryCount: 2, isMemoryEnabled: true },
      isLoading: false,
      isError: false,
    });
    expect(mockUseMemoryCount).toHaveBeenCalledWith(aiIndex.id, { enabled: true, retry: 1 });
    expect(mockUseAiIndexDreaming).toHaveBeenCalledWith(aiIndex.id, { enabled: true, retry: 1 });
  });

  it('has no progress until the AI index loads', () => {
    const { result } = renderHook(() =>
      useSetupWizardProgress({
        aiIndex: undefined,
        isMemoryEnabled: true,
        isSetupWizardEnabled: true,
      })
    );

    expect(result.current.progress).toBeUndefined();
  });

  it.each([
    ['the AI index is managed', { ...aiIndex, managed: true }, true, true],
    ['memory is off', aiIndex, false, true],
    ['the setup wizard setting is off', aiIndex, true, false],
  ])('loads nothing when %s', (_label, index, isMemoryEnabled, isSetupWizardEnabled) => {
    renderHook(() =>
      useSetupWizardProgress({ aiIndex: index, isMemoryEnabled, isSetupWizardEnabled })
    );

    expect(mockUseMemoryCount).toHaveBeenCalledWith(index.id, { enabled: false, retry: 1 });
    expect(mockUseAiIndexDreaming).toHaveBeenCalledWith(index.id, { enabled: false, retry: 1 });
  });

  it('is loading or failed when either request is', () => {
    mockUseMemoryCount.mockReturnValue({ memoryCount: 0, isLoading: true, isError: false });
    mockUseAiIndexDreaming.mockReturnValue({
      dreaming: undefined,
      workflowIds: [],
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() =>
      useSetupWizardProgress({ aiIndex, isMemoryEnabled: true, isSetupWizardEnabled: true })
    );

    expect(result.current).toMatchObject({ isLoading: true, isError: true });
  });
});
