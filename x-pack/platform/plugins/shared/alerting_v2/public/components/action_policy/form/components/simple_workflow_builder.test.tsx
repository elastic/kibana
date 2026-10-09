/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ConnectorCreationConfig } from '@kbn/alerting-v2-rule-form';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from '../constants';
import type { ActionPolicyFormState } from '../types';
import { SimpleWorkflowBuilder } from './simple_workflow_builder';

let mockWorkflowsEnabled = true;
let mockIsActionValid = true;

const INLINE_DEFS = [
  {
    id: 'email',
    label: 'Email',
    iconType: 'mail',
    connectorTypeId: '.email',
    paramsTemplate: 'to: ""\n',
  },
  {
    id: 'slack',
    label: 'Slack',
    iconType: 'logoSlack',
    connectorTypeId: '.slack',
    paramsTemplate: 'message: ""\n',
  },
];

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'uiSettings') {
      return { get: () => mockWorkflowsEnabled };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/alerting-v2-rule-form', () => ({
  INLINE_ACTION_STEP_DEFINITIONS: INLINE_DEFS,
  getInlineActionStepDefinition: (id: string) => INLINE_DEFS.find((d) => d.id === id),
  isActionValid: () => mockIsActionValid,
  InlineWorkflowEditor: ({
    value,
    connectorCreationConfig,
    forceShowErrors,
  }: {
    value: { id: string };
    connectorCreationConfig?: ConnectorCreationConfig;
    forceShowErrors?: boolean;
  }) => (
    <div
      data-test-subj={`inlineWorkflowEditor-${value.id}`}
      data-connector-creation-mode={connectorCreationConfig?.mode}
      data-connector-creation-href={
        connectorCreationConfig?.mode === 'new-tab' ? connectorCreationConfig.href : undefined
      }
      data-force-show-errors={String(Boolean(forceShowErrors))}
    />
  ),
}));

const renderBuilder = (
  defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE,
  connectorCreation?: ConnectorCreationConfig
) => {
  const onSubmit = jest.fn();
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({ defaultValues });
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <SimpleWorkflowBuilder connectorCreationConfig={connectorCreation} />
          <button type="button" data-test-subj="submit" onClick={methods.handleSubmit(onSubmit)}>
            submit
          </button>
        </FormProvider>
      </I18nProvider>
    );
  };
  return { ...render(<TestComponent />), onSubmit };
};

describe('SimpleWorkflowBuilder', () => {
  beforeEach(() => {
    mockWorkflowsEnabled = true;
    mockIsActionValid = true;
  });

  it('renders add buttons for each inline step definition', () => {
    renderBuilder();

    expect(screen.getByTestId('simpleWorkflowAdd-email')).toBeInTheDocument();
    expect(screen.getByTestId('simpleWorkflowAdd-slack')).toBeInTheDocument();
  });

  it('renders nothing when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderBuilder();

    expect(screen.queryByTestId('simpleWorkflowBuilder')).not.toBeInTheDocument();
  });

  it('adds a draft with its inline editor when an add button is clicked', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));

    const editor = await screen.findByTestId(/inlineWorkflowEditor-/);
    expect(editor).toBeInTheDocument();
    // The add buttons remain so more workflows can be created.
    expect(screen.getByTestId('simpleWorkflowAdd-slack')).toBeInTheDocument();
  });

  it('forwards the connector creation config to inline workflow editors', async () => {
    const user = userEvent.setup();
    renderBuilder(DEFAULT_FORM_STATE, { mode: 'new-tab', href: '/connectors' });

    await user.click(screen.getByTestId('simpleWorkflowAdd-slack'));

    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-connector-creation-mode',
      'new-tab'
    );
    expect(screen.getByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-connector-creation-href',
      '/connectors'
    );
  });

  it('removes a draft when its remove button is clicked', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-email'));
    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toBeInTheDocument();

    await user.click(screen.getByTestId(/simpleWorkflowRemove-/));
    expect(screen.queryByTestId(/inlineWorkflowEditor-/)).not.toBeInTheDocument();
  });

  it('does not force draft errors before a submit attempt', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-email'));

    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
      'data-force-show-errors',
      'false'
    );
  });

  it('blocks submit while a draft is invalid and forces its errors', async () => {
    mockIsActionValid = false;
    const user = userEvent.setup();
    const { onSubmit } = renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-email'));
    await user.click(screen.getByTestId('submit'));

    await waitFor(() =>
      expect(screen.getByTestId(/inlineWorkflowEditor-/)).toHaveAttribute(
        'data-force-show-errors',
        'true'
      )
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits once every draft is valid', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-email'));
    await user.click(screen.getByTestId('submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
