/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import type { InlineWorkflowEditorProps } from './inline_workflow_editor';
import { InlineWorkflowEditor } from './inline_workflow_editor';
import type { InlineWorkflowActionDraft } from '../types';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') return { get: jest.fn().mockResolvedValue([]) };
    if (token === 'notifications') return { toasts: { addError: jest.fn() } };
    if (token === 'uiSettings') return { get: () => true };
    if (token === 'settings') return { client: { get: () => undefined } };
    if (token === 'docLinks') return { links: {} };
    if (token === 'application') return { getUrlForApp: () => '/' };
    if (token === 'plugin.start.triggersActionsUi')
      return { getAddConnectorFlyout: jest.fn().mockReturnValue(null) };
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => `plugin.start.${key}`,
}));

jest.mock('../hooks/use_fetch_connectors_by_type', () => ({
  ALL_CONNECTORS_KEY: ['alertingV2', 'actionForm', 'connectors'],
  useFetchConnectorsByType: () => ({ data: [], isLoading: false }),
}));

jest.mock('../hooks/use_fetch_slack_channels', () => ({
  useFetchSlackChannels: () => ({ data: [], isFetching: false }),
}));

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: () => ({ setQueryData: jest.fn() }),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    'aria-label': ariaLabel,
  }: {
    value: string;
    onChange?: (v: string) => void;
    'aria-label'?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-test-subj="mockedCodeEditor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

const slackDraft = (): InlineWorkflowActionDraft => ({
  id: 'wf-1',
  source: 'inline',
  workflowName: 'Slack notification',
  steps: [
    {
      id: 'step-1',
      stepType: 'slack2.sendMessage',
      stepName: 'notify',
      connectorId: 'slack-1',
      params: '',
    },
  ],
});

const emailDraft = (): InlineWorkflowActionDraft => ({
  id: 'wf-1',
  source: 'inline',
  workflowName: 'Email notification',
  steps: [
    {
      id: 'step-1',
      stepType: 'email',
      stepName: 'notify',
      connectorId: 'email-1',
      params: '',
    },
  ],
});

const renderEditor = (props: Partial<InlineWorkflowEditorProps> = {}) => {
  const onChange = jest.fn();
  const result = render(
    <I18nProvider>
      <InlineWorkflowEditor value={slackDraft()} onChange={onChange} {...props} />
    </I18nProvider>
  );
  return { ...result, onChange };
};

describe('InlineWorkflowEditor', () => {
  it('renders the SlackChannelSelector when stepType is slack2.sendMessage', () => {
    renderEditor();
    expect(screen.getByTestId('slackChannelSelector')).toBeInTheDocument();
  });

  it('does not render the SlackChannelSelector when stepType is not slack2.sendMessage', () => {
    renderEditor({ value: emailDraft() });
    expect(screen.queryByTestId('slackChannelSelector')).not.toBeInTheDocument();
  });

  it('always renders the ParamsEditor for the expanded step', () => {
    renderEditor();
    expect(screen.getByTestId('mockedCodeEditor')).toBeInTheDocument();
  });

  it('renders action type and step name fields', () => {
    renderEditor();
    expect(screen.getByTestId('inlineWorkflowActionTypeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('inlineWorkflowStepNameInput')).toHaveValue('notify');
  });

  it('can add another step once the current steps are saved and valid', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor({
      value: {
        id: 'wf-1',
        source: 'inline',
        workflowName: 'Email notification',
        steps: [
          {
            id: 'step-1',
            stepType: 'email',
            stepName: 'notify',
            connectorId: 'email-1',
            params: 'to: "ops@example.com"\nsubject: "Hi"\nmessage: "Body"\n',
          },
        ],
      },
    });

    // First step starts expanded; Add step appears after saving (collapsing) it.
    expect(screen.queryByTestId('inlineWorkflowAddStep')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('inlineWorkflowStepDone-step-1'));

    await user.click(screen.getByTestId('inlineWorkflowAddStep'));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls.at(-1)?.[0] as InlineWorkflowActionDraft;
    expect(next.steps).toHaveLength(2);
  });

  it('shows a disabled add step after collapsing an incomplete step', async () => {
    const user = userEvent.setup();
    renderEditor({ value: emailDraft() });

    expect(screen.queryByTestId('inlineWorkflowAddStep')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('inlineWorkflowStepCollapse-step-1'));
    expect(screen.getByTestId('inlineWorkflowAddStep')).toBeDisabled();
  });
});
