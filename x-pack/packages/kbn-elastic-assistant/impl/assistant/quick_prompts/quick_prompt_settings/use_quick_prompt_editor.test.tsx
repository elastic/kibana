/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useQuickPromptEditor, DEFAULT_COLOR } from './use_quick_prompt_editor';
import { mockAlertPromptContext } from '../../../mock/prompt_context';
import { MOCK_QUICK_PROMPTS } from '../../../mock/quick_prompt';
import { PromptResponse } from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';

// Mock functions for the tests
const mockOnSelectedQuickPromptChange = jest.fn();
const mockSetUpdatedQuickPromptSettings = jest.fn();
const mockPreviousQuickPrompts = [...MOCK_QUICK_PROMPTS];
const setPromptsBulkActions = jest.fn();

describe('useQuickPromptEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete a quick prompt by title', () => {
    const { result } = renderHook(() =>
      useQuickPromptEditor({
        onSelectedQuickPromptChange: mockOnSelectedQuickPromptChange,
        setUpdatedQuickPromptSettings: mockSetUpdatedQuickPromptSettings,
        setPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    act(() => {
      result.current.onQuickPromptDeleted('ALERT_SUMMARIZATION_TITLE');
    });

    expect(mockSetUpdatedQuickPromptSettings.mock.calls[0][0]?.(mockPreviousQuickPrompts)).toEqual(
      MOCK_QUICK_PROMPTS.filter((qp) => qp.name !== 'ALERT_SUMMARIZATION_TITLE')
    );
  });

  test('should handle selection of a new quick prompt', () => {
    const newPromptTitle = 'New Prompt';
    const { result } = renderHook(() =>
      useQuickPromptEditor({
        onSelectedQuickPromptChange: mockOnSelectedQuickPromptChange,
        setUpdatedQuickPromptSettings: mockSetUpdatedQuickPromptSettings,
        setPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    act(() => {
      result.current.onQuickPromptSelectionChange(newPromptTitle);
    });

    const newPrompt: PromptResponse = {
      name: newPromptTitle,
      content: '',
      color: DEFAULT_COLOR,
      categories: [],
      id: '',
      promptType: 'quick',
    };

    expect(mockOnSelectedQuickPromptChange).toHaveBeenCalledWith(newPrompt);
    expect(mockSetUpdatedQuickPromptSettings.mock.calls[0][0]?.(mockPreviousQuickPrompts)).toEqual([
      ...MOCK_QUICK_PROMPTS,
      newPrompt,
    ]);
  });

  test('should handle prompt selection', async () => {
    const { result } = renderHook(() =>
      useQuickPromptEditor({
        onSelectedQuickPromptChange: mockOnSelectedQuickPromptChange,
        setUpdatedQuickPromptSettings: mockSetUpdatedQuickPromptSettings,
        setPromptsBulkActions,
        promptsBulkActions: {},
      })
    );

    const alertData = await mockAlertPromptContext.getPromptContext();

    const expectedPrompt: PromptResponse = {
      name: mockAlertPromptContext.description,
      content: alertData.content ?? '',
      color: DEFAULT_COLOR,
      categories: [mockAlertPromptContext.category],
      id: '',
      promptType: 'quick',
    };

    act(() => {
      result.current.onQuickPromptSelectionChange(expectedPrompt);
    });

    expect(mockOnSelectedQuickPromptChange).toHaveBeenCalledWith(expectedPrompt);
    expect(
      mockSetUpdatedQuickPromptSettings.mock.calls[0][0]?.(mockPreviousQuickPrompts)
    ).toContain(expectedPrompt);
  });
});
