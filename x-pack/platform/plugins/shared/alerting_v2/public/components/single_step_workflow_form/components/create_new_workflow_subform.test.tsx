/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { CreateWorkflowFormValue } from '../types';
import { CreateNewWorkflowSubform } from './create_new_workflow_subform';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn(), setQueryData: jest.fn() }),
}));

let capturedFlyoutProps: Record<string, unknown> = {};
const mockGetAddConnectorFlyout = jest.fn().mockImplementation((props: Record<string, unknown>) => {
  capturedFlyoutProps = props;
  return null;
});

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'plugin.start.triggersActionsUi') {
      return { getAddConnectorFlyout: mockGetAddConnectorFlyout };
    }
    return {
      get: jest.fn().mockResolvedValue([]),
      toasts: { addError: jest.fn() },
    };
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

jest.mock('../hooks/use_fetch_connectors_by_type', () => ({
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

  describe('Create new connector', () => {
    beforeEach(() => {
      mockGetAddConnectorFlyout.mockClear();
      capturedFlyoutProps = {};
    });

    it('renders the "+ Create new connector" link', () => {
      renderSubform({ typeId: 'email' });
      expect(screen.getByTestId('singleStepWorkflowCreateConnectorLink')).toBeInTheDocument();
    });

    it('opens the create connector flyout pre-seeded with the matching action type', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderSubform({ typeId: 'email' });

      await user.click(screen.getByTestId('singleStepWorkflowCreateConnectorLink'));

      expect(mockGetAddConnectorFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ initialConnector: { actionTypeId: '.email' } })
      );
    });

    it('selects the new connector and closes the flyout after creation', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderSubform({ typeId: 'email' });

      await user.click(screen.getByTestId('singleStepWorkflowCreateConnectorLink'));

      const { onConnectorCreated } = capturedFlyoutProps as {
        onConnectorCreated: (connector: { id: string }) => void;
      };
      act(() => {
        onConnectorCreated({ id: 'new-connector-id' });
      });

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'new-connector-id' })
      );
    });

    it('closes the flyout without selecting a connector when onClose is called', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderSubform({ typeId: 'email' });

      await user.click(screen.getByTestId('singleStepWorkflowCreateConnectorLink'));
      expect(mockGetAddConnectorFlyout).toHaveBeenCalledTimes(1);

      const { onClose } = capturedFlyoutProps as { onClose: () => void };
      act(() => {
        onClose();
      });

      // flyout is no longer rendered after close
      expect(mockGetAddConnectorFlyout).toHaveBeenCalledTimes(1);
    });
  });
});
