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
import { ActionForm } from './action_form';
import type { ActionFormValue } from './types';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => {
    if (queryKey[0] === 'alertingV2RuleForm') {
      return {
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
      };
    }
    return { data: undefined, isLoading: true };
  },
}));

const mockGetAddConnectorFlyout = jest.fn().mockReturnValue(null);

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: 'mock.WorkflowApi',
}));

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
    if (token === 'mock.WorkflowApi') {
      return { getWorkflows: jest.fn() };
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

jest.mock('./hooks/use_fetch_connectors_by_type', () => ({
  ALL_CONNECTORS_KEY: ['alertingV2', 'actionForm', 'connectors'],
  useFetchConnectorsByType: ({ connectorTypeId }: { connectorTypeId: string | null }) => ({
    data:
      connectorTypeId === '.email'
        ? [{ id: 'email-1', name: 'Email connector', connectorTypeId: '.email' }]
        : connectorTypeId === '.slack2'
        ? [{ id: 'slack-2', name: 'Slack v2 connector', connectorTypeId: '.slack2' }]
        : [],
    isLoading: false,
  }),
}));

const renderForm = (
  initialValue: ActionFormValue = [],
  extraProps: { isInvalid?: boolean } = {}
) => {
  const onChange = jest.fn();
  const result = render(
    <I18nProvider>
      <ActionForm value={initialValue} onChange={onChange} {...extraProps} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('ActionForm', () => {
  describe('empty state — card picker', () => {
    it('renders three action template cards when list is empty', () => {
      renderForm();
      expect(screen.getByTestId('actionTemplateCard-existing-workflow')).toBeInTheDocument();
      expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
      expect(
        screen.getByTestId('actionTemplateCard-inline-slack2.sendMessage')
      ).toBeInTheDocument();
    });

    it('picking the existing-workflow card adds an existing-source action to the list', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('actionTemplateCard-existing-workflow'));

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted: ActionFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].source).toBe('existing');
      expect((emitted[0] as { workflowId: string | null }).workflowId).toBeNull();
      expect(emitted[0].id).toBeTruthy();
    });

    it('picking the inline-email card adds an inline action with email step type and params template', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('actionTemplateCard-inline-email'));

      const emitted: ActionFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].source).toBe('inline');
      expect((emitted[0] as { stepType: string }).stepType).toBe('email');
      expect((emitted[0] as { params: string }).params).toContain('to:');
      expect(emitted[0].id).toBeTruthy();
    });

    it('picking the inline-slack2.sendMssage card adds an inline action with slack step type and params template', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm();

      await user.click(screen.getByTestId('actionTemplateCard-inline-slack2.sendMessage'));

      const emitted: ActionFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(1);
      expect(emitted[0].source).toBe('inline');
      expect((emitted[0] as { stepType: string }).stepType).toBe('slack2.sendMessage');
      expect((emitted[0] as { params: string }).params).toContain('channel:');
      expect((emitted[0] as { params: string }).params).toContain('text:');
    });
  });

  describe('list with actions', () => {
    const emailAction = {
      id: 'action-1',
      source: 'inline' as const,
      stepType: 'email' as const,
      connectorId: 'email-1',
      params: 'to: ""\n',
    };

    const slackV2Action = {
      id: 'action-3',
      source: 'inline' as const,
      stepType: 'slack2.sendMessage' as const,
      connectorId: 'slack-2',
      params: 'channel: ""\ntext: ""\n',
    };

    it('renders actions in collapsed state (icon + label visible)', () => {
      renderForm([emailAction]);
      expect(screen.getByTestId(`actionRow-${emailAction.id}`)).toBeInTheDocument();
    });

    it('shows the expand toggle and remove button for each action', () => {
      renderForm([emailAction]);
      expect(screen.getByTestId(`actionRowToggle-${emailAction.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`actionRowRemove-${emailAction.id}`)).toBeInTheDocument();
    });

    it('expands an action when the toggle is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailAction]);

      await user.click(screen.getByTestId(`actionRowToggle-${emailAction.id}`));

      expect(screen.getByTestId('inlineWorkflowEditor')).toBeInTheDocument();
    });

    it('auto-collapses the previously-expanded action when a second action is expanded', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailAction, slackV2Action]);

      await user.click(screen.getByTestId(`actionRowToggle-${emailAction.id}`));
      expect(screen.getByTestId('inlineWorkflowEditor')).toBeInTheDocument();

      await user.click(screen.getByTestId(`actionRowToggle-${slackV2Action.id}`));
      expect(screen.getAllByTestId('inlineWorkflowEditor')).toHaveLength(1);
    });

    it('removes the action when the remove button is clicked', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailAction]);

      await user.click(screen.getByTestId(`actionRowRemove-${emailAction.id}`));

      const emitted: ActionFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(0);
    });

    it('shows the "Add another action" button when there are actions (below max)', () => {
      renderForm([emailAction]);
      expect(screen.getByTestId('actionFormAddAnother')).toBeInTheDocument();
    });

    it('clicking "Add another action" reveals the card picker', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderForm([emailAction]);

      await user.click(screen.getByTestId('actionFormAddAnother'));

      expect(screen.getByTestId('actionTemplateCard-inline-email')).toBeInTheDocument();
    });

    it('picking a card from the inline picker appends a new action', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailAction]);

      await user.click(screen.getByTestId('actionFormAddAnother'));
      await user.click(screen.getByTestId('actionTemplateCard-inline-slack2.sendMessage'));

      const emitted: ActionFormValue = onChange.mock.calls[0][0];
      expect(emitted).toHaveLength(2);
      expect(emitted[1].source).toBe('inline');
      expect((emitted[1] as { stepType: string }).stepType).toBe('slack2.sendMessage');
    });

    it('clicking Cancel hides the card picker without adding an action', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const { onChange } = renderForm([emailAction]);

      await user.click(screen.getByTestId('actionFormAddAnother'));
      expect(
        screen.getByTestId('actionTemplateCard-inline-slack2.sendMessage')
      ).toBeInTheDocument();

      await user.click(screen.getByTestId('actionFormCancelPicker'));

      expect(
        screen.queryByTestId('actionTemplateCard-inline-slack2.sendMessage')
      ).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('hides "Add another action" when 10 actions are present', () => {
      const tenActions: ActionFormValue = Array.from({ length: 10 }, (_, i) => ({
        id: `action-${i}`,
        source: 'inline' as const,
        stepType: 'email' as const,
        connectorId: null,
        params: '',
      }));
      renderForm(tenActions);
      expect(screen.queryByTestId('actionFormAddAnother')).not.toBeInTheDocument();
    });
  });

  describe('expanded action — existing workflow source', () => {
    it('shows the workflow reference selector when an existing-source action is expanded', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const action = { id: 'w1', source: 'existing' as const, workflowId: null };
      renderForm([action]);

      await user.click(screen.getByTestId(`actionRowToggle-${action.id}`));

      expect(screen.getByTestId('workflowReferenceSelector')).toBeInTheDocument();
    });

    it('shows all workflows (unfiltered) in the selector', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const action = { id: 'w1', source: 'existing' as const, workflowId: null };
      renderForm([action]);

      await user.click(screen.getByTestId(`actionRowToggle-${action.id}`));
      await user.click(screen.getByTestId('comboBoxSearchInput'));

      expect(screen.getByText('My first workflow')).toBeInTheDocument();
      expect(screen.getByText('My second workflow')).toBeInTheDocument();
    });
  });

  describe('expanded action — inline email step', () => {
    it('shows connector selector and params editor', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      const action = {
        id: 'e1',
        source: 'inline' as const,
        stepType: 'email' as const,
        connectorId: null,
        params: 'to: ""\n',
      };
      renderForm([action]);

      await user.click(screen.getByTestId(`actionRowToggle-${action.id}`));

      expect(screen.getByTestId('inlineWorkflowEditor')).toBeInTheDocument();
      expect(screen.getByTestId('singleStepWorkflowParamsEditor')).toBeInTheDocument();
    });
  });

  describe('invalid action indicator', () => {
    it('shows an error indicator on an incomplete action when isInvalid is true', () => {
      const action = {
        id: 'e1',
        source: 'inline' as const,
        stepType: 'email' as const,
        connectorId: null,
        params: '',
      };
      renderForm([action], { isInvalid: true });
      expect(screen.getByTestId(`actionRowInvalid-${action.id}`)).toBeInTheDocument();
    });

    it('does not show error indicator on a complete action even when isInvalid is true', () => {
      const action = {
        id: 'e1',
        source: 'inline' as const,
        stepType: 'email' as const,
        connectorId: 'email-1',
        params: 'to: "user@example.com"\n',
      };
      renderForm([action], { isInvalid: true });
      expect(screen.queryByTestId(`actionRowInvalid-${action.id}`)).not.toBeInTheDocument();
    });
  });
});
