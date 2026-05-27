/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { CreateWorkflowFormValue } from '../types';
import { CreateNewWorkflowSubform } from './create_new_workflow_subform';

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({
    get: jest.fn().mockResolvedValue([]),
    toasts: { addError: jest.fn() },
  }),
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

jest.mock('../hooks/use_fetch_connectors_by_type', () => ({
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

const renderSubform = (overrides: Partial<CreateWorkflowFormValue> = {}) => {
  const onChange = jest.fn();
  const value: CreateWorkflowFormValue = {
    mode: 'create',
    typeId: 'email',
    connectorId: null,
    params: 'to: ""\n',
    ...overrides,
  };
  const result = render(
    <I18nProvider>
      <CreateNewWorkflowSubform value={value} onChange={onChange} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('CreateNewWorkflowSubform', () => {
  it('emits a fresh slack template and clears the connector when switching type', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onChange } = renderSubform({
      typeId: 'email',
      connectorId: 'email-1',
      params: 'to: "ops@example.com"\n',
    });

    await user.click(screen.getByTestId('singleStepWorkflowTypeSelect'));
    await user.click(screen.getByText('Slack'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next).toMatchObject({
      mode: 'create',
      typeId: 'slack',
      connectorId: null,
    });
    expect(next.params).toContain('message:');
    expect(next.params).not.toContain('to:');
  });

  it('emits the new connector id when the user selects one', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onChange } = renderSubform({ typeId: 'email' });

    await user.click(screen.getByTestId('comboBoxSearchInput'));
    await user.click(screen.getByText('Email connector'));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ connectorId: 'email-1' }));
  });

  it('emits new params when the editor value changes', () => {
    const { onChange } = renderSubform({ typeId: 'email', params: 'to: ""\n' });

    const editor = screen.getByTestId('singleStepWorkflowParamsEditor');
    fireEvent.change(editor, { target: { value: 'message: "hi"' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ params: 'message: "hi"' }));
  });
});
