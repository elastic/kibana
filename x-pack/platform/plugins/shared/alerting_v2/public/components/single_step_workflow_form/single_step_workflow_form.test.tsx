/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SingleStepWorkflowForm } from './single_step_workflow_form';
import type { SingleStepWorkflowFormValue } from './types';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const mockGetAddConnectorFlyout = jest.fn().mockReturnValue(null);

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { getUrlForApp: (appId: string) => `/app/${appId}` };
    }
    if (token === 'uiSettings') {
      return { get: () => true };
    }
    if (token === 'notifications') {
      return { toasts: { addError: jest.fn() } };
    }
    if (token === 'http') {
      return { get: jest.fn().mockResolvedValue([]) };
    }
    if (token === 'plugin.start.triggersActionsUi') {
      return { getAddConnectorFlyout: mockGetAddConnectorFlyout };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin.start.${key}`,
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    dataTestSubj,
    'aria-label': ariaLabel,
  }: {
    value: string;
    onChange?: (value: string) => void;
    dataTestSubj?: string;
    'aria-label'?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj ?? 'mockedCodeEditor'}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

jest.mock('../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      page: 1,
      size: 100,
      total: 2,
      results: [
        { id: 'wf-1', name: 'My first workflow' },
        { id: 'wf-2', name: 'My second workflow' },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('./hooks/use_fetch_connectors_by_type', () => ({
  ALL_CONNECTORS_KEY: ['alertingV2', 'singleStepWorkflow', 'connectors'],
  useFetchConnectorsByType: ({ connectorTypeId }: { connectorTypeId: string | null }) => ({
    data:
      connectorTypeId === '.email'
        ? [{ id: 'email-1', name: 'Email connector', connectorTypeId: '.email' }]
        : connectorTypeId === '.slack'
        ? [{ id: 'slack-1', name: 'Slack connector', connectorTypeId: '.slack' }]
        : [],
    isLoading: false,
  }),
}));

const renderForm = (
  initialValue: SingleStepWorkflowFormValue = { kind: 'unselected' },
  extraProps: { isInvalid?: boolean; errorMessage?: string } = {}
) => {
  const onChange = jest.fn();
  const result = render(
    <I18nProvider>
      <SingleStepWorkflowForm value={initialValue} onChange={onChange} {...extraProps} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('SingleStepWorkflowForm', () => {
  describe('unselected state — card picker', () => {
    it('renders three action type cards', () => {
      renderForm();
      expect(screen.getByTestId('singleStepWorkflowCard-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowCard-email')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowCard-slack')).toBeInTheDocument();
    });

    it('emits { kind: workflow } when the Workflow card is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-workflow'));

      expect(onChange).toHaveBeenCalledWith({ kind: 'workflow', workflowId: null });
    });

    it('emits { kind: email } with email params template when Email card is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-email'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0][0];
      expect(emitted.kind).toBe('email');
      expect(emitted.connectorId).toBeNull();
      expect(emitted.params).toContain('to:');
    });

    it('emits { kind: slack } with slack params template when Slack card is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-slack'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0][0];
      expect(emitted.kind).toBe('slack');
      expect(emitted.connectorId).toBeNull();
      expect(emitted.params).toContain('message:');
    });
  });

  describe('workflow panel', () => {
    it('renders the workflow reference selector when kind is workflow', () => {
      renderForm({ kind: 'workflow', workflowId: null });

      expect(screen.getByTestId('singleStepWorkflowForm')).toBeInTheDocument();
      expect(screen.getByTestId('workflowReferenceSelector')).toBeInTheDocument();
    });

    it('shows all workflows (unfiltered) in the selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm({ kind: 'workflow', workflowId: null });

      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('My first workflow')).toBeInTheDocument();
      expect(screen.getByText('My second workflow')).toBeInTheDocument();
    });

    it('does not offer a "Create new workflow" option', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm({ kind: 'workflow', workflowId: null });

      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.queryByText(/create new workflow/i)).not.toBeInTheDocument();
    });

    it('propagates isInvalid and errorMessage to the workflow selector', () => {
      renderForm(
        { kind: 'workflow', workflowId: null },
        { isInvalid: true, errorMessage: 'Workflow is required' }
      );
      expect(screen.getByText('Workflow is required')).toBeInTheDocument();
    });
  });

  describe('email panel', () => {
    it('renders connector selector and params editor when kind is email', () => {
      renderForm({ kind: 'email', connectorId: null, params: 'to: ""\n' });

      expect(screen.getByTestId('singleStepWorkflowForm')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowParamsEditor')).toBeInTheDocument();
    });

    it('lists .email connectors in the connector selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm({ kind: 'email', connectorId: null, params: '' });

      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('Email connector')).toBeInTheDocument();
    });
  });

  describe('slack panel', () => {
    it('renders connector selector and params editor when kind is slack', () => {
      renderForm({ kind: 'slack', connectorId: null, params: 'message: ""\n' });

      expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowParamsEditor')).toBeInTheDocument();
    });

    it('lists .slack connectors in the connector selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm({ kind: 'slack', connectorId: null, params: '' });

      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('Slack connector')).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    it('emits { kind: unselected } when the back link is clicked from any panel', async () => {
      const user = userEvent.setup();
      const { onChange } = renderForm({
        kind: 'email',
        connectorId: 'email-1',
        params: 'to: ""\n',
      });

      await user.click(screen.getByTestId('singleStepWorkflowBackLink'));

      expect(onChange).toHaveBeenCalledWith({ kind: 'unselected' });
    });

    it('emits { kind: unselected } from the workflow panel too', async () => {
      const user = userEvent.setup();
      const { onChange } = renderForm({ kind: 'workflow', workflowId: 'wf-1' });

      await user.click(screen.getByTestId('singleStepWorkflowBackLink'));

      expect(onChange).toHaveBeenCalledWith({ kind: 'unselected' });
    });
  });
});
