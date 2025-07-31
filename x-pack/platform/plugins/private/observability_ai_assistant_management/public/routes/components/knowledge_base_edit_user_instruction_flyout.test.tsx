/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { KnowledgeBaseEditUserInstructionFlyout } from './knowledge_base_edit_user_instruction_flyout';
import { useGetUserInstructions } from '../../hooks/use_get_user_instructions';
import { useCreateKnowledgeBaseUserInstruction } from '../../hooks/use_create_knowledge_base_user_instruction';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
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
    // Set up initial state with an existing instruction
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

    const wrapper = mountWithIntl(<KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />);

    // Wait for the component to load and initialize with the existing instruction
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      wrapper.update();
    });

    // Clear the instruction
    await act(async () => {
      const textarea = wrapper.find('textarea').first();
      textarea.simulate('change', { target: { value: '' } });
    });

    await act(async () => {
      const saveButton = wrapper.find(
        'button[data-test-subj="knowledgeBaseEditManualEntryFlyoutSaveButton"]'
      );
      saveButton.simulate('click');
    });

    expect(deleteMock).toHaveBeenCalledWith({
      id: existingId,
      isUserInstruction: true,
    });

    expect(createOrUpdateMock).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not delete entry when submitting with non-empty text', async () => {
    // Set up initial state with an existing instruction
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

    const wrapper = mountWithIntl(<KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />);

    // Wait for the component to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      wrapper.update();
    });

    // Update the text
    await act(async () => {
      const textarea = wrapper.find('textarea').first();
      textarea.simulate('change', { target: { value: 'Updated instruction' } });
    });

    // Submit the form
    await act(async () => {
      const saveButton = wrapper.find(
        'button[data-test-subj="knowledgeBaseEditManualEntryFlyoutSaveButton"]'
      );
      saveButton.simulate('click');
    });

    // Verify deletion was not called
    expect(deleteMock).not.toHaveBeenCalled();

    // Verify create/update was called with correct params
    expect(createOrUpdateMock).toHaveBeenCalledWith({
      entry: {
        id: existingId,
        text: 'Updated instruction',
        public: false,
      },
    });

    // Verify flyout was closed
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should update existing instruction with new text', async () => {
    // Set up initial state with an existing instruction
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

    const wrapper = mountWithIntl(<KnowledgeBaseEditUserInstructionFlyout onClose={mockOnClose} />);

    // Wait for the component to load and initialize with the existing instruction
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      wrapper.update();
    });

    // Verify the textarea is initialized with the original text
    const initialTextarea = wrapper.find('textarea').first();
    expect(initialTextarea.prop('value')).toBe(originalText);

    // Update the instruction text
    await act(async () => {
      const textarea = wrapper.find('textarea').first();
      textarea.simulate('change', { target: { value: updatedText } });
    });

    // Submit the form
    await act(async () => {
      const saveButton = wrapper.find(
        'button[data-test-subj="knowledgeBaseEditManualEntryFlyoutSaveButton"]'
      );
      saveButton.simulate('click');
    });

    // Verify the update was called with the correct parameters
    expect(createOrUpdateMock).toHaveBeenCalledWith({
      entry: {
        id: existingId,
        text: updatedText,
        public: false,
      },
    });

    // Verify that delete was not called
    expect(deleteMock).not.toHaveBeenCalled();

    // Verify the flyout was closed
    expect(mockOnClose).toHaveBeenCalled();
  });
});
