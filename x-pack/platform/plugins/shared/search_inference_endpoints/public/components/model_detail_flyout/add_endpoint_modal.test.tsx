/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import type { TaskTypeOption } from './add_endpoint_modal';
import { AddEndpointModal } from './add_endpoint_modal';

const defaultTaskTypes: TaskTypeOption[] = [
  {
    value: 'chat_completion',
    label: 'Chat completion',
    description: 'For conversational AI assistants and chat applications.',
    recommended: true,
  },
  {
    value: 'completion',
    label: 'Completion',
    description: 'For text generation and completion tasks.',
  },
];

function getEndpointIdInput(): HTMLInputElement {
  const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
  const endpointInput = inputs.find((input) => /^elastic-/.test(input.value) || !input.readOnly);
  if (!endpointInput) throw new Error('Could not find endpoint ID input');
  return endpointInput;
}

describe('AddEndpointModal', () => {
  const onSave = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderModal = (overrides = {}) =>
    render(
      <AddEndpointModal
        modelId="anthropic-claude-4.6-opus"
        taskTypes={defaultTaskTypes}
        onSave={onSave}
        onCancel={onCancel}
        {...overrides}
      />
    );

  it('renders modal with title', () => {
    renderModal();
    expect(screen.getByText('Add endpoint')).toBeInTheDocument();
  });

  it('displays readonly model ID', () => {
    renderModal();
    const modelInput = screen.getByDisplayValue('anthropic-claude-4.6-opus');
    expect(modelInput).toHaveAttribute('readonly');
  });

  it('renders task type options', () => {
    renderModal();
    expect(screen.getByText('Chat completion')).toBeInTheDocument();
    expect(screen.getByText('Completion')).toBeInTheDocument();
  });

  it('shows Recommended badge for recommended task type', () => {
    renderModal();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('auto-generates endpoint ID with elastic prefix and task type', () => {
    renderModal();
    const input = getEndpointIdInput();
    expect(input.value).toMatch(/^elastic-chat_completion-[a-z0-9]+$/);
  });

  it('updates endpoint ID when task type changes', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Completion'));
    const input = getEndpointIdInput();
    expect(input.value).toMatch(/^elastic-completion-[a-z0-9]+$/);
  });

  it('preserves user-edited endpoint ID when task type changes', () => {
    renderModal();
    const input = getEndpointIdInput();
    fireEvent.change(input, { target: { value: 'my-custom-id' } });

    fireEvent.click(screen.getByLabelText('Completion'));
    expect(screen.getByDisplayValue('my-custom-id')).toBeInTheDocument();
  });

  it('calls onSave with endpoint ID and task type', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('addEndpointModalSaveButton'));
    expect(onSave).toHaveBeenCalledWith(
      expect.stringMatching(/^elastic-chat_completion-/),
      'chat_completion'
    );
  });

  it('calls onCancel when cancel button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables save button when endpoint ID is empty', () => {
    renderModal();
    const input = getEndpointIdInput();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByTestId('addEndpointModalSaveButton')).toBeDisabled();
  });

  it('disables save button when endpoint ID is invalid', () => {
    renderModal();
    const input = getEndpointIdInput();
    fireEvent.change(input, { target: { value: '.invalid-id' } });
    expect(screen.getByTestId('addEndpointModalSaveButton')).toBeDisabled();
  });
});
