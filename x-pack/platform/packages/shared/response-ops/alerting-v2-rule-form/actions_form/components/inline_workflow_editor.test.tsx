/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import type { InlineWorkflowEditorProps } from './inline_workflow_editor';
import { InlineWorkflowEditor } from './inline_workflow_editor';

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    useService: (token: unknown) => {
      if (token === 'http') return { get: vi.fn().mockResolvedValue([]) };
      if (token === 'notifications') return { toasts: { addError: vi.fn() } };
      if (token === 'uiSettings') return { get: () => true };
      if (token === 'settings') return { client: { get: () => undefined } };
      if (token === 'docLinks') return { links: {} };
      if (token === 'application') return { getUrlForApp: () => '/' };
      if (token === 'plugin.start.triggersActionsUi')
        return { getAddConnectorFlyout: vi.fn().mockReturnValue(null) };
      return {};
    },
    CoreStart: (key: string) => key,
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/core-di', () => {
  const mocked = {
    PluginStart: (key: string) => `plugin.start.${key}`,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_fetch_connectors_by_type', () => {
  const mocked = {
    ALL_CONNECTORS_KEY: ['alertingV2', 'actionForm', 'connectors'],
    useFetchConnectorsByType: () => ({ data: [], isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_fetch_slack_channels', () => {
  const mocked = {
    useFetchSlackChannels: () => ({ data: [], isFetching: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/react-query', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/react-query')),
    useQueryClient: () => ({ setQueryData: vi.fn() }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./connector_selector', () => {
  const mocked = {
    ConnectorSelector: ({
      connectorCreationConfig,
    }: {
      connectorCreationConfig?: { mode: string; href?: string };
    }) => (
      <div
        data-test-subj="connectorSelector"
        data-connector-creation-mode={connectorCreationConfig?.mode}
        data-connector-creation-href={connectorCreationConfig?.href}
      />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/code-editor', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

const renderEditor = (props: Partial<InlineWorkflowEditorProps> = {}) => {
  const onChange = vi.fn();
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
});
