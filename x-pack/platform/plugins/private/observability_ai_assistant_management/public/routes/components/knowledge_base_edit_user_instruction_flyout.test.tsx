/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { KnowledgeBaseEditUserInstructionFlyout } from './knowledge_base_edit_user_instruction_flyout';
import { useGetUserInstructions } from '../../hooks/use_get_user_instructions';
import { useCreateKnowledgeBaseUserInstruction } from '../../hooks/use_create_knowledge_base_user_instruction';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { renderWithI18n } from '@kbn/test-jest-helpers'; // Add this import
import { fireEvent } from '@testing-library/react';
jest.mock('../../hooks/use_get_user_instructions');
jest.mock('../../hooks/use_create_knowledge_base_user_instruction');
jest.mock('../../hooks/use_delete_knowledge_base_entry');

const useGetUserInstructionsMock = useGetUserInstructions as jest.Mock;
const useCreateKnowledgeBaseUserInstructionMock =
  useCreateKnowledgeBaseUserInstruction as jest.Mock;
const useDeleteKnowledgeBaseEntryMock = useDeleteKnowledgeBaseEntry as jest.Mock;

const getUserInstructionsMock = jest.fn(() => Promise.resolve([]));
const createOrUpdateMock = jest.fn(() => Promise.resolve());
const deleteMock = jest.fn(() => Promise.resolve());
const mockOnClose = jest.fn();

const getBaseMutationResult = () => ({
  isLoading: false,
  isSuccess: false,
  isError: false,
  isIdle: true,
  status: 'idle',
  data: undefined,
  error: null,
});

describe('KnowledgeBaseEditUserInstructionFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useGetUserInstructionsMock.mockReturnValue({
      userInstructions: [],
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: getUserInstructionsMock,
    });

    useCreateKnowledgeBaseUserInstructionMock.mockReturnValue({
      mutateAsync: createOrUpdateMock,
      ...getBaseMutationResult(),
    });

    useDeleteKnowledgeBaseEntryMock.mockReturnValue({
      mutate: deleteMock,
      mutateAsync: deleteMock,
      ...getBaseMutationResult(),
    });
  });

  it('should delete entry when submitting with empty text', async () => {
    const existingId = 'test-id';
    useGetUserInstructionsMock.mockReturnValue({
      userInstructions: [
        {
          id: existingId,
          text: 'Original instruction',
          public: false,
        },
      ],
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: getUserInstructionsMock,
    });

    const { findByRole, findByTestId } = renderWithI18n(
      <KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />
    );

    // Wait for the component to load and initialize with the existing instruction
    const textarea = (await findByRole('textbox')) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '' } });

    const saveButton = await findByTestId('knowledgeBaseEditManualEntryFlyoutSaveButton');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(deleteMock).toHaveBeenCalledWith({
      id: existingId,
      isUserInstruction: true,
    });

    expect(createOrUpdateMock).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not delete entry when submitting with non-empty text', async () => {
    const existingId = 'test-id';
    useGetUserInstructionsMock.mockReturnValue({
      userInstructions: [
        {
          id: existingId,
          text: 'Original instruction',
          public: false,
        },
      ],
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: getUserInstructionsMock,
    });

    const { findByRole, findByTestId } = renderWithI18n(
      <KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />
    );

    const textarea = (await findByRole('textbox')) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated instruction' } });

    const saveButton = await findByTestId('knowledgeBaseEditManualEntryFlyoutSaveButton');
    await act(async () => {
      fireEvent.click(saveButton);
    });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(createOrUpdateMock).toHaveBeenCalledWith({
      entry: {
        id: existingId,
        text: 'Updated instruction',
        public: false,
      },
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update existing instruction with new text', async () => {
    const existingId = 'test-id';
    const originalText = 'Original instruction';
    const updatedText = 'This is the updated instruction text';

    useGetUserInstructionsMock.mockReturnValue({
      userInstructions: [
        {
          id: existingId,
          text: originalText,
          public: false,
        },
      ],
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: getUserInstructionsMock,
    });

    const { findByRole, findByTestId } = renderWithI18n(
      <KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />
    );

    const textarea = (await findByRole('textbox')) as HTMLTextAreaElement;
    expect(textarea.value).toBe(originalText);

    fireEvent.change(textarea, { target: { value: updatedText } });

    const saveButton = await findByTestId('knowledgeBaseEditManualEntryFlyoutSaveButton');
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(createOrUpdateMock).toHaveBeenCalledWith({
      entry: {
        id: existingId,
        text: updatedText,
        public: false,
      },
    });
    expect(deleteMock).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('save button should be disabled when no text is entered and no user instruction was previously saved', async () => {
    useGetUserInstructionsMock.mockReturnValue({
      userInstructions: [],
      isLoading: false,
      isRefetching: false,
      isSuccess: true,
      isError: false,
      refetch: getUserInstructionsMock,
    });

    const { findByTestId } = renderWithI18n(
      <KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />
    );

    const saveButton = (await findByTestId(
      'knowledgeBaseEditManualEntryFlyoutSaveButton'
    )) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(saveButton);
      expect(saveButton.disabled).toBe(true);
    });

    expect(deleteMock).not.toHaveBeenCalled();
    expect(createOrUpdateMock).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
