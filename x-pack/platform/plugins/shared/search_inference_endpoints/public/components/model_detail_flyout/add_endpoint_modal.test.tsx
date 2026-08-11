/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TaskTypeOption } from './add_endpoint_modal';
import { AddEndpointModal } from './add_endpoint_modal';

const mockMutate = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: { toasts: { addSuccess: jest.fn(), addDanger: jest.fn() } },
    },
  }),
}));

jest.mock('@kbn/inference-endpoint-ui-common', () => ({
  useInferenceEndpointMutation: () => ({
    mutate: mockMutate,
    isLoading: false,
  }),
}));

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
  const endpointInput = inputs.find((input) => !input.readOnly);
  if (!endpointInput) throw new Error('Could not find endpoint ID input');
  return endpointInput;
}

describe('AddEndpointModal', () => {
  const onSave = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('auto-generates endpoint ID based on model and task type', () => {
    renderModal();
    const input = getEndpointIdInput();
    expect(input.value).toMatch(/^anthropic-claude-4_6-opus-chat_completion-[a-z0-9]+$/);
  });

  it('updates endpoint ID when task type changes', () => {
    renderModal();
    fireEvent.click(screen.getByLabelText('Completion'));
    const input = getEndpointIdInput();
    expect(input.value).toMatch(/^anthropic-claude-4_6-opus-completion-[a-z0-9]+$/);
  });

  it('preserves user-edited endpoint ID when task type changes', () => {
    renderModal();
    const input = getEndpointIdInput();
    fireEvent.change(input, { target: { value: 'my-custom-id' } });

    fireEvent.click(screen.getByLabelText('Completion'));
    expect(screen.getByDisplayValue('my-custom-id')).toBeInTheDocument();
  });

  it('calls saveEndpoint mutation with correct config on save', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('addEndpointModalSaveButton'));
    expect(mockMutate).toHaveBeenCalledWith(
      {
        config: {
          inferenceId: expect.stringMatching(/^anthropic-claude-4_6-opus-chat_completion-/),
          taskType: 'chat_completion',
          provider: 'elastic',
          providerConfig: { model_id: 'anthropic-claude-4.6-opus' },
        },
        secrets: { providerSecrets: {} },
      },
      false
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

  describe('view mode', () => {
    it('renders View endpoint title', () => {
      renderModal({ mode: 'view', initialEndpointId: 'my-ep', initialTaskType: 'completion' });
      expect(screen.getByText('View endpoint')).toBeInTheDocument();
    });

    it('shows Close button instead of Save/Cancel', () => {
      renderModal({ mode: 'view', initialEndpointId: 'my-ep', initialTaskType: 'completion' });
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('calls onCancel when Close is clicked', () => {
      renderModal({ mode: 'view', initialEndpointId: 'my-ep', initialTaskType: 'completion' });
      fireEvent.click(screen.getByText('Close'));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Reasoning section', () => {
    it('shows the reasoning toggle when chat_completion is selected', async () => {
      renderModal();
      expect(screen.getByTestId('addEndpointReasoningToggle')).toBeInTheDocument();
    });

    it('does not show the reasoning toggle when a non-chat_completion task type is selected', async () => {
      renderModal({
        taskTypes: [{ value: 'completion', label: 'Completion', description: 'Text completion.' }],
      });
      expect(screen.queryByTestId('addEndpointReasoningToggle')).not.toBeInTheDocument();
    });

    it('hides the effort level button group when auto mode is on (default)', async () => {
      renderModal();
      expect(screen.queryByTestId('addEndpointReasoningButtonGroup')).not.toBeInTheDocument();
    });

    it('shows the effort level button group and token usage note when auto mode is turned off', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      expect(screen.getByTestId('addEndpointReasoningButtonGroup')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningTokenUsageNote')).toBeInTheDocument();
    });

    it('shows all six effort levels: none, min, low, med, high, extra-high', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      expect(screen.getByTestId('addEndpointReasoningEffort-none')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningEffort-minimal')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningEffort-low')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningEffort-medium')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningEffort-high')).toBeInTheDocument();
      expect(screen.getByTestId('addEndpointReasoningEffort-xhigh')).toBeInTheDocument();
    });

    it('defaults to med effort when auto mode is first turned off', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      const medButton = screen.getByTestId('addEndpointReasoningEffort-medium');
      expect(medButton).toBeInTheDocument();
      expect(medButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('changes effort level when a different option is clicked', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      const highButton = screen.getByTestId('addEndpointReasoningEffort-high');
      await userEvent.click(highButton);
      expect(highButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('hides reasoning section when task type is switched away from chat_completion', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      expect(screen.getByTestId('addEndpointReasoningButtonGroup')).toBeInTheDocument();

      await userEvent.click(screen.getByLabelText('Completion'));
      expect(screen.queryByTestId('addEndpointReasoningToggle')).not.toBeInTheDocument();
    });

    it('resets to auto mode when switching back to chat_completion', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      await userEvent.click(screen.getByLabelText('Completion'));
      await userEvent.click(screen.getByLabelText(/Chat completion/i));

      expect(screen.getByTestId('addEndpointReasoningToggle')).toBeInTheDocument();
      expect(screen.queryByTestId('addEndpointReasoningButtonGroup')).not.toBeInTheDocument();
    });

    it('resets effort level to med when switching away from chat_completion and back', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      await userEvent.click(screen.getByTestId('addEndpointReasoningEffort-high'));
      expect(
        screen.getByTestId('addEndpointReasoningEffort-high').getAttribute('aria-pressed')
      ).toBe('true');

      await userEvent.click(screen.getByLabelText('Completion'));
      await userEvent.click(screen.getByLabelText(/Chat completion/i));
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));

      expect(
        screen.getByTestId('addEndpointReasoningEffort-medium').getAttribute('aria-pressed')
      ).toBe('true');
    });

    it('disables the reasoning toggle in view mode', async () => {
      renderModal({ mode: 'view', initialEndpointId: 'my-ep', initialTaskType: 'chat_completion' });
      const toggle = screen.getByTestId('addEndpointReasoningToggle');
      expect(toggle).toBeDisabled();
    });

    it('preselects the stored reasoning effort in view mode', async () => {
      renderModal({
        mode: 'view',
        initialEndpointId: 'my-ep',
        initialTaskType: 'chat_completion',
        initialReasoningEffort: 'high',
      });

      const toggle = screen.getByTestId('addEndpointReasoningToggle');
      expect(toggle).toBeChecked();

      const highButton = screen.getByTestId('addEndpointReasoningEffort-high');
      expect(highButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('shows auto mode in view mode when no reasoning effort was stored', async () => {
      renderModal({ mode: 'view', initialEndpointId: 'my-ep', initialTaskType: 'chat_completion' });

      const toggle = screen.getByTestId('addEndpointReasoningToggle');
      expect(toggle).not.toBeChecked();
      expect(screen.queryByTestId('addEndpointReasoningButtonGroup')).not.toBeInTheDocument();
    });

    it('does not include taskTypeConfig in the save payload when auto mode is on', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointModalSaveButton'));
      expect(mockMutate).toHaveBeenCalledWith(
        {
          config: {
            inferenceId: expect.stringMatching(/^anthropic-claude-4_6-opus-chat_completion-/),
            taskType: 'chat_completion',
            provider: 'elastic',
            providerConfig: { model_id: 'anthropic-claude-4.6-opus' },
          },
          secrets: { providerSecrets: {} },
        },
        false
      );
      expect(mockMutate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ taskTypeConfig: expect.anything() }),
        }),
        expect.anything()
      );
    });

    it('includes taskTypeConfig with the selected reasoning effort in the save payload', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      await userEvent.click(screen.getByTestId('addEndpointReasoningEffort-high'));

      await userEvent.click(screen.getByTestId('addEndpointModalSaveButton'));
      expect(mockMutate).toHaveBeenCalledWith(
        {
          config: {
            inferenceId: expect.stringMatching(/^anthropic-claude-4_6-opus-chat_completion-/),
            taskType: 'chat_completion',
            provider: 'elastic',
            providerConfig: { model_id: 'anthropic-claude-4.6-opus' },
            taskTypeConfig: { reasoning: { effort: 'high' } },
          },
          secrets: { providerSecrets: {} },
        },
        false
      );
    });

    it('sends the Elasticsearch-recognized "xhigh" value when extra-high is selected', async () => {
      renderModal();
      await userEvent.click(screen.getByTestId('addEndpointReasoningToggle'));
      await userEvent.click(screen.getByTestId('addEndpointReasoningEffort-xhigh'));

      await userEvent.click(screen.getByTestId('addEndpointModalSaveButton'));
      expect(mockMutate).toHaveBeenCalledWith(
        {
          config: {
            inferenceId: expect.stringMatching(/^anthropic-claude-4_6-opus-chat_completion-/),
            taskType: 'chat_completion',
            provider: 'elastic',
            providerConfig: { model_id: 'anthropic-claude-4.6-opus' },
            taskTypeConfig: { reasoning: { effort: 'xhigh' } },
          },
          secrets: { providerSecrets: {} },
        },
        false
      );
    });
  });
});
