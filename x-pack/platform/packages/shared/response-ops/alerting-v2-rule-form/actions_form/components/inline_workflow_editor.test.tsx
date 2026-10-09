/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { getInlineActionStepDefinition } from '../registry';
import type { InlineWorkflowActionDraft } from '../types';
import type { InlineWorkflowEditorProps } from './inline_workflow_editor';
import { InlineWorkflowEditor } from './inline_workflow_editor';

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

jest.mock('./connector_selector', () => ({
  ConnectorSelector: ({
    connectorCreationConfig,
    error,
    onBlur,
  }: {
    connectorCreationConfig?: { mode: string; href?: string };
    error?: string;
    onBlur?: () => void;
  }) => (
    <div
      data-test-subj="connectorSelector"
      data-connector-creation-mode={connectorCreationConfig?.mode}
      data-connector-creation-href={connectorCreationConfig?.href}
    >
      <input data-test-subj="connectorSelectorInput" onBlur={onBlur} />
      {error && <span>{error}</span>}
    </div>
  ),
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

const EMAIL_TEMPLATE = getInlineActionStepDefinition('email')?.paramsTemplate ?? '';

const draft = (overrides: Partial<InlineWorkflowActionDraft> = {}): InlineWorkflowActionDraft => ({
  id: 'step-1',
  source: 'inline',
  stepType: 'email',
  connectorId: null,
  params: EMAIL_TEMPLATE,
  ...overrides,
});

type StatefulEditorProps = Omit<InlineWorkflowEditorProps, 'value' | 'onChange'>;

const StatefulEditor = ({
  initialValue,
  ...props
}: StatefulEditorProps & { initialValue: InlineWorkflowActionDraft }) => {
  const [value, setValue] = useState(initialValue);
  return <InlineWorkflowEditor {...props} value={value} onChange={setValue} />;
};

const renderStatefulEditor = (
  initialValue: InlineWorkflowActionDraft,
  props: StatefulEditorProps = {}
) =>
  render(
    <I18nProvider>
      <StatefulEditor initialValue={initialValue} {...props} />
    </I18nProvider>
  );

const typeParams = (params: string) =>
  fireEvent.change(screen.getByTestId('mockedCodeEditor'), { target: { value: params } });

const renderEditor = (props: Partial<InlineWorkflowEditorProps> = {}) => {
  const onChange = jest.fn();
  const result = render(
    <I18nProvider>
      <InlineWorkflowEditor
        value={{
          id: 'step-1',
          source: 'inline',
          stepType: 'slack2.sendMessage',
          connectorId: 'slack-1',
          params: '',
        }}
        onChange={onChange}
        {...props}
      />
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
    renderEditor({
      value: {
        id: 'step-1',
        source: 'inline',
        stepType: 'email',
        connectorId: 'email-1',
        params: '',
      },
    });
    expect(screen.queryByTestId('slackChannelSelector')).not.toBeInTheDocument();
  });

  it('always renders the ParamsEditor', () => {
    renderEditor();
    expect(screen.getByTestId('mockedCodeEditor')).toBeInTheDocument();
  });

  it('forwards the connector creation mode to the connector selector', () => {
    renderEditor({ connectorCreationConfig: { mode: 'new-tab', href: '/connectors' } });

    expect(screen.getByTestId('connectorSelector')).toHaveAttribute(
      'data-connector-creation-mode',
      'new-tab'
    );
    expect(screen.getByTestId('connectorSelector')).toHaveAttribute(
      'data-connector-creation-href',
      '/connectors'
    );
  });

  describe('validation errors', () => {
    it('does not show errors for an untouched draft', () => {
      renderStatefulEditor(draft());

      expect(screen.queryByText('Select a connector.')).not.toBeInTheDocument();
      expect(screen.queryByText('to is required.')).not.toBeInTheDocument();
      expect(screen.queryByText('subject is required.')).not.toBeInTheDocument();
    });

    it('shows every error when forced', () => {
      renderStatefulEditor(draft(), { forceShowErrors: true });

      expect(screen.getByText('Select a connector.')).toBeInTheDocument();
      expect(screen.getByText('Add at least one recipient to to, cc, or bcc.')).toBeInTheDocument();
      expect(screen.getByText('subject is required.')).toBeInTheDocument();
      expect(screen.getByText('message is required.')).toBeInTheDocument();
    });

    it('shows params errors once the params are edited, without the connector error', () => {
      renderStatefulEditor(draft());

      typeParams('to: user@example.com\nsubject: Hi\nmessage: Body\n');

      expect(screen.getByText('to must be a list of email addresses.')).toBeInTheDocument();
      expect(screen.queryByText('Select a connector.')).not.toBeInTheDocument();
    });

    it('updates params errors as the params change', () => {
      renderStatefulEditor(draft({ connectorId: 'email-1' }));

      typeParams('to:\n  - me@\nsubject: Hi\nmessage: Body\n');
      expect(screen.getByText('to has invalid email addresses: me@.')).toBeInTheDocument();

      typeParams('to:\n  - me@example.com\nsubject: Hi\nmessage: Body\n');
      expect(screen.queryByText(/invalid email addresses/)).not.toBeInTheDocument();
    });

    it('reports YAML syntax errors with their location', () => {
      renderStatefulEditor(draft());

      typeParams('to: "unterminated\n');

      expect(screen.getByText(/^Invalid YAML on line 2, column 1:/)).toBeInTheDocument();
    });

    it('keeps showing params errors after reverting to the template', () => {
      renderStatefulEditor(draft());

      typeParams('subject: Hi\n');
      typeParams(EMAIL_TEMPLATE);

      expect(screen.getByText('subject is required.')).toBeInTheDocument();
    });

    it('shows the connector error once the connector selector is blurred', () => {
      renderStatefulEditor(draft());

      fireEvent.blur(screen.getByTestId('connectorSelectorInput'));

      expect(screen.getByText('Select a connector.')).toBeInTheDocument();
      expect(screen.queryByText('subject is required.')).not.toBeInTheDocument();
    });

    it('flags the Slack channel selector when the channel is missing', () => {
      renderStatefulEditor(
        draft({
          stepType: 'slack2.sendMessage',
          connectorId: 'slack-1',
          params: 'channel: ""\ntext: hello\n',
        }),
        { forceShowErrors: true }
      );

      expect(screen.getByText('channel is required.')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
