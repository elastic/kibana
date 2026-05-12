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
    return {};
  },
  CoreStart: (key: string) => key,
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
        { id: 'wf-1', name: 'Existing single-step email' },
        { id: 'wf-2', name: 'Existing single-step slack' },
      ],
    },
    isLoading: false,
  }),
}));

jest.mock('./hooks/use_fetch_connectors_by_type', () => ({
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
  initialValue: SingleStepWorkflowFormValue = { mode: 'existing', workflowId: null }
) => {
  const onChange = jest.fn();
  const result = render(
    <I18nProvider>
      <SingleStepWorkflowForm value={initialValue} onChange={onChange} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('SingleStepWorkflowForm', () => {
  it('renders the existing workflow selector by default', () => {
    renderForm();
    expect(screen.getByTestId('singleStepWorkflowSelector')).toBeInTheDocument();
  });

  it('emits a "create" value when the user picks the create option', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onChange } = renderForm();

    await user.click(screen.getByTestId('comboBoxSearchInput'));
    await user.click(screen.getByText('+ Create new workflow'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'create',
        typeId: 'email',
        connectorId: null,
      })
    );
    const created = onChange.mock.calls[0][0];
    expect(created.params).toContain('to:');
  });

  it('emits an "existing" value when the user selects a workflow', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onChange } = renderForm();

    await user.click(screen.getByTestId('comboBoxSearchInput'));
    await user.click(screen.getByText('Existing single-step email'));

    expect(onChange).toHaveBeenCalledWith({ mode: 'existing', workflowId: 'wf-1' });
  });

  it('renders the subform when in create mode', () => {
    renderForm({
      mode: 'create',
      typeId: 'email',
      connectorId: null,
      params: 'to: ""\n',
    });

    expect(screen.getByTestId('singleStepWorkflowForm')).toBeInTheDocument();
    expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();
    expect(screen.getByTestId('singleStepWorkflowParamsEditor')).toBeInTheDocument();
  });

  it('reverts to existing mode when the back link is clicked', async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm({
      mode: 'create',
      typeId: 'email',
      connectorId: 'email-1',
      params: 'to: ""\n',
    });

    await user.click(screen.getByTestId('singleStepWorkflowBackToExistingLink'));

    expect(onChange).toHaveBeenCalledWith({ mode: 'existing', workflowId: null });
  });
});
