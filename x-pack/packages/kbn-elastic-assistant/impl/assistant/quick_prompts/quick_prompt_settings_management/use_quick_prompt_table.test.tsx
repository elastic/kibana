/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useQuickPromptTable } from './use_quick_prompt_table';
import { EuiTableComputedColumnType } from '@elastic/eui';
import { MOCK_QUICK_PROMPTS } from '../../../mock/quick_prompt';
import { mockPromptContexts } from '../../../mock/prompt_context';
import { PromptResponse } from '@kbn/elastic-assistant-common';

const mockOnEditActionClicked = jest.fn();
const mockOnDeleteActionClicked = jest.fn();

describe('useQuickPromptTable', () => {
  const { result } = renderHook(() => useQuickPromptTable());
  const props = {
    isActionsDisabled: false,
    basePromptContexts: mockPromptContexts,
    onEditActionClicked: mockOnEditActionClicked,
    onDeleteActionClicked: mockOnDeleteActionClicked,
  };

  describe('getColumns', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should return columns with correct render functions', () => {
      const columns = result.current.getColumns(props);

      expect(columns).toHaveLength(4);
      expect(columns[0].name).toBe('Name');
      expect(columns[1].name).toBe('Contexts');
      expect(columns[2].name).toBe('Date updated');
      expect(columns[3].name).toBe('Actions');
    });

    it('should render contexts column correctly', () => {
      const columns = result.current.getColumns(props);

      const mockQuickPrompt = { ...MOCK_QUICK_PROMPTS[0], categories: ['alert'] };
      const mockBadgesColumn = (columns[1] as EuiTableComputedColumnType<PromptResponse>).render(
        mockQuickPrompt
      );
      const selectedPromptContexts = mockPromptContexts
        .filter((bpc) => mockQuickPrompt.categories?.some((cat) => bpc.category === cat))
        .map((bpc) => bpc.description);
      expect(mockBadgesColumn).toHaveProperty('props', {
        items: selectedPromptContexts,
        prefix: MOCK_QUICK_PROMPTS[0].name,
      });
    });

    it('should not render delete action for non-deletable prompt', () => {
      const columns = result.current.getColumns(props);

      const mockRowActions = (columns[3] as EuiTableComputedColumnType<PromptResponse>).render(
        MOCK_QUICK_PROMPTS[0]
      );

      expect(mockRowActions).toHaveProperty('props', {
        disabled: false,
        rowItem: MOCK_QUICK_PROMPTS[0],
        onDelete: undefined,
        onEdit: mockOnEditActionClicked,
        isDeletable: false,
      });
    });

    it('should render delete actions correctly for deletable prompt', () => {
      const columns = result.current.getColumns(props);

      const nonDefaultPrompt = MOCK_QUICK_PROMPTS.find((qp) => !qp.isDefault);
      if (nonDefaultPrompt) {
        const mockRowActions = (columns[3] as EuiTableComputedColumnType<PromptResponse>).render(
          nonDefaultPrompt
        );
        expect(mockRowActions).toHaveProperty('props', {
          disabled: false,
          rowItem: nonDefaultPrompt,
          onDelete: mockOnDeleteActionClicked,
          onEdit: mockOnEditActionClicked,
          isDeletable: true,
        });
      }
    });
  });
});
