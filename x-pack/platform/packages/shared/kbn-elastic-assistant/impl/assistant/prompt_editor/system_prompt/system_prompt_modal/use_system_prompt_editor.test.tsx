/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useSystemPromptEditor } from './use_system_prompt_editor';
import {
  mockSystemPrompt,
  mockSuperheroSystemPrompt,
  mockSystemPrompts,
} from '../../../../mock/system_prompt';
import { PromptResponse } from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../../../assistant_context';

jest.mock('../../../../assistant_context');
// Mock functions for the tests
const mockOnSelectedSystemPromptChange = jest.fn();
const mockSetUpdatedSystemPromptSettings = jest.fn();
const mockSetPromptsBulkActions = jest.fn();
const mockPreviousSystemPrompts = [...mockSystemPrompts];

describe('useSystemPromptEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockReturnValue({
      currentAppId: 'securitySolutionUI',
    });
  });

  test('should delete a system prompt by id', () => {
    const { result } = renderHook(() =>
      useSystemPromptEditor({
        onSelectedSystemPromptChange: mockOnSelectedSystemPromptChange,
        setUpdatedSystemPromptSettings: mockSetUpdatedSystemPromptSettings,
        setPromptsBulkActions: mockSetPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    act(() => {
      result.current.onSystemPromptDeleted('mock-system-prompt-1');
    });

    expect(
      mockSetUpdatedSystemPromptSettings.mock.calls[0][0]?.(mockPreviousSystemPrompts)
    ).toEqual(mockSystemPrompts.filter((sp) => sp.id !== 'mock-system-prompt-1'));
  });

  test('should handle selection of an existing system prompt', () => {
    const existingPrompt: PromptResponse = mockSystemPrompt;
    const { result } = renderHook(() =>
      useSystemPromptEditor({
        onSelectedSystemPromptChange: mockOnSelectedSystemPromptChange,
        setUpdatedSystemPromptSettings: mockSetUpdatedSystemPromptSettings,
        setPromptsBulkActions: mockSetPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    act(() => {
      result.current.onSystemPromptSelectionChange(existingPrompt);
    });

    expect(mockOnSelectedSystemPromptChange).toHaveBeenCalledWith(existingPrompt);
    expect(
      mockSetUpdatedSystemPromptSettings.mock.calls[0][0]?.(mockPreviousSystemPrompts)
    ).toEqual(mockSystemPrompts);
  });

  test('should handle selection of a new system prompt', () => {
    const newPromptId = 'new-system-prompt';
    const { result } = renderHook(() =>
      useSystemPromptEditor({
        onSelectedSystemPromptChange: mockOnSelectedSystemPromptChange,
        setUpdatedSystemPromptSettings: mockSetUpdatedSystemPromptSettings,
        setPromptsBulkActions: mockSetPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    act(() => {
      result.current.onSystemPromptSelectionChange(newPromptId);
    });

    const newPrompt: PromptResponse = {
      id: newPromptId,
      content: '',
      name: newPromptId,
      promptType: 'system',
      consumer: 'securitySolutionUI',
    };

    expect(mockOnSelectedSystemPromptChange).toHaveBeenCalledWith(newPrompt);
    expect(
      mockSetUpdatedSystemPromptSettings.mock.calls[0][0]?.(mockPreviousSystemPrompts)
    ).toEqual([...mockSystemPrompts, newPrompt]);
  });

  test('should handle prompt selection with an existing system prompt id', () => {
    const { result } = renderHook(() =>
      useSystemPromptEditor({
        onSelectedSystemPromptChange: mockOnSelectedSystemPromptChange,
        setUpdatedSystemPromptSettings: mockSetUpdatedSystemPromptSettings,
        setPromptsBulkActions: mockSetPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    const expectedPrompt: PromptResponse = mockSuperheroSystemPrompt;

    act(() => {
      result.current.onSystemPromptSelectionChange(expectedPrompt);
    });

    expect(mockOnSelectedSystemPromptChange).toHaveBeenCalledWith(expectedPrompt);
    expect(
      mockSetUpdatedSystemPromptSettings.mock.calls[0][0]?.(mockPreviousSystemPrompts)
    ).toContain(expectedPrompt);
  });
});
