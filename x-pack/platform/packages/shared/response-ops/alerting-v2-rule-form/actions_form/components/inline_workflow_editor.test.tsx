/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
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
});
