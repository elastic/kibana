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
  initialValue: SingleStepWorkflowFormValue = [],
  extraProps: { isInvalid?: boolean } = {}
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
  describe('empty state — card picker', () => {
    it('renders three action type cards when list is empty', () => {
      renderForm();
      expect(screen.getByTestId('singleStepWorkflowCard-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowCard-email')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowCard-slack')).toBeInTheDocument();
    });

    it('picking the Workflow card adds an item with kind workflow to the list', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-workflow'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted: SingleStepWorkflowFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].kind).toBe('workflow');
      expect((emitted[0] as { workflowId: string | null }).workflowId).toBeNull();
      expect(emitted[0].id).toBeTruthy();
    });

    it('picking the Email card adds an item with kind email and params template', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-email'));

      const emitted: SingleStepWorkflowFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].kind).toBe('email');
      expect((emitted[0] as { params: string }).params).toContain('to:');
      expect(emitted[0].id).toBeTruthy();
    });

    it('picking the Slack card adds an item with kind slack and params template', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('singleStepWorkflowCard-slack'));

      const emitted: SingleStepWorkflowFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].kind).toBe('slack');
      expect((emitted[0] as { params: string }).params).toContain('message:');
    });
  });

  describe('list with items', () => {
    const emailItem = {
      id: 'item-1',
      kind: 'email' as const,
      connectorId: 'email-1',
      params: 'to: ""\n',
    };

    const slackItem = {
      id: 'item-2',
      kind: 'slack' as const,
      connectorId: 'slack-1',
      params: 'message: ""\n',
    };

    it('renders items in collapsed state (icon + kind label visible)', () => {
      renderForm([emailItem]);
      expect(screen.getByTestId(`workflowItemRow-${emailItem.id}`)).toBeInTheDocument();
    });

    it('shows the expand toggle and remove button for each item', () => {
      renderForm([emailItem]);
      expect(screen.getByTestId(`workflowItemRowToggle-${emailItem.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`workflowItemRowRemove-${emailItem.id}`)).toBeInTheDocument();
    });

    it('expands an item when the toggle is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailItem]);

      await user.click(screen.getByTestId(`workflowItemRowToggle-${emailItem.id}`));

      expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();
    });

    it('auto-collapses the previously-expanded item when a second item is expanded', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailItem, slackItem]);

      await user.click(screen.getByTestId(`workflowItemRowToggle-${emailItem.id}`));
      expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();

      await user.click(screen.getByTestId(`workflowItemRowToggle-${slackItem.id}`));
      expect(screen.getAllByTestId('singleStepWorkflowSubform')).toHaveLength(1);
    });

    it('removes the item when the remove button is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailItem]);

      await user.click(screen.getByTestId(`workflowItemRowRemove-${emailItem.id}`));

      const emitted: SingleStepWorkflowFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(0);
    });

    it('shows the "Add another action" button when there are items (below max)', () => {
      renderForm([emailItem]);
      expect(screen.getByTestId('singleStepWorkflowAddAnother')).toBeInTheDocument();
    });

    it('clicking "Add another action" reveals the card picker', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailItem]);

      await user.click(screen.getByTestId('singleStepWorkflowAddAnother'));

      expect(screen.getByTestId('singleStepWorkflowCard-slack')).toBeInTheDocument();
    });

    it('picking a card from the inline picker appends a new item', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailItem]);

      await user.click(screen.getByTestId('singleStepWorkflowAddAnother'));
      await user.click(screen.getByTestId('singleStepWorkflowCard-slack'));

      const emitted: SingleStepWorkflowFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(2);
      expect(emitted[1].kind).toBe('slack');
    });

    it('clicking Cancel hides the card picker without adding an item', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailItem]);

      await user.click(screen.getByTestId('singleStepWorkflowAddAnother'));
      expect(screen.getByTestId('singleStepWorkflowCard-slack')).toBeInTheDocument();

      await user.click(screen.getByTestId('singleStepWorkflowCancelPicker'));

      expect(screen.queryByTestId('singleStepWorkflowCard-slack')).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('hides "Add another action" when 10 items are present', () => {
      const tenItems: SingleStepWorkflowFormValue = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        kind: 'email' as const,
        connectorId: null,
        params: '',
      }));
      renderForm(tenItems);
      expect(screen.queryByTestId('singleStepWorkflowAddAnother')).not.toBeInTheDocument();
    });
  });

  describe('workflow item expanded — workflow kind', () => {
    it('shows the workflow reference selector when a workflow item is expanded', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const item = { id: 'w1', kind: 'workflow' as const, workflowId: null };
      renderForm([item]);

      await user.click(screen.getByTestId(`workflowItemRowToggle-${item.id}`));

      expect(screen.getByTestId('workflowReferenceSelector')).toBeInTheDocument();
    });

    it('shows all workflows (unfiltered) in the selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const item = { id: 'w1', kind: 'workflow' as const, workflowId: null };
      renderForm([item]);

      await user.click(screen.getByTestId(`workflowItemRowToggle-${item.id}`));
      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('My first workflow')).toBeInTheDocument();
      expect(screen.getByText('My second workflow')).toBeInTheDocument();
    });
  });

  describe('workflow item expanded — email kind', () => {
    it('shows connector selector and params editor', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const item = { id: 'e1', kind: 'email' as const, connectorId: null, params: 'to: ""\n' };
      renderForm([item]);

      await user.click(screen.getByTestId(`workflowItemRowToggle-${item.id}`));

      expect(screen.getByTestId('singleStepWorkflowSubform')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowParamsEditor')).toBeInTheDocument();
    });
  });

  describe('invalid item indicator', () => {
    it('shows an error indicator on an incomplete item when isInvalid is true', () => {
      const item = { id: 'e1', kind: 'email' as const, connectorId: null, params: '' };
      renderForm([item], { isInvalid: true });
      expect(screen.getByTestId(`workflowItemRowInvalid-${item.id}`)).toBeInTheDocument();
    });

    it('does not show error indicator on a complete item even when isInvalid is true', () => {
      const item = {
        id: 'e1',
        kind: 'email' as const,
        connectorId: 'email-1',
        params: 'to: ""\n',
      };
      renderForm([item], { isInvalid: true });
      expect(screen.queryByTestId(`workflowItemRowInvalid-${item.id}`)).not.toBeInTheDocument();
    });
  });
});
