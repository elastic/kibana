/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from '../constants';
import type { ActionPolicyFormState } from '../types';
import { SimpleWorkflowBuilder } from './simple_workflow_builder';

let mockWorkflowsEnabled = true;

const INLINE_DEFS = [
  {
    id: 'email',
    label: 'Email',
    iconType: 'email',
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
  InlineWorkflowEditor: ({ value }: { value: { id: string } }) => (
    <div data-test-subj={`inlineWorkflowEditor-${value.id}`} />
  ),
}));

const renderBuilder = (defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE) => {
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({ defaultValues });
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <SimpleWorkflowBuilder />
        </FormProvider>
      </I18nProvider>
    );
  };
  return render(<TestComponent />);
};

describe('SimpleWorkflowBuilder', () => {
  beforeEach(() => {
    mockWorkflowsEnabled = true;
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

  it('removes a draft when its remove button is clicked', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.click(screen.getByTestId('simpleWorkflowAdd-email'));
    expect(await screen.findByTestId(/inlineWorkflowEditor-/)).toBeInTheDocument();

    await user.click(screen.getByTestId(/simpleWorkflowRemove-/));
    expect(screen.queryByTestId(/inlineWorkflowEditor-/)).not.toBeInTheDocument();
  });
});
