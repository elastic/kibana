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
import { EuiFlexGroup } from '@elastic/eui';
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

jest.mock('@kbn/alerting-v2-rule-form', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockReact = require('react') as typeof import('react');
  return {
    INLINE_ACTION_STEP_DEFINITIONS: INLINE_DEFS,
    getInlineActionStepDefinition: (id: string) => INLINE_DEFS.find((d) => d.id === id),
    getDefaultInlineActionStepDefinition: () => INLINE_DEFS[0],
    InlineWorkflowEditor: ({
      value,
      onEditingStepChange,
    }: {
      value: { id: string };
      onEditingStepChange?: (isEditing: boolean) => void;
    }) => {
      mockReact.useEffect(() => {
        onEditingStepChange?.(false);
      }, [onEditingStepChange]);
      return <div data-test-subj={`inlineWorkflowEditor-${value.id}`} />;
    },
  };
});

const SEED_DRAFT = {
      id: 'draft-1',
      source: 'inline' as const,
      workflowName: 'Email notification',
      steps: [
        {
          id: 'draft-1-step',
          stepType: 'email' as const,
          stepName: 'notify',
          connectorId: null,
          params: 'to: ""\n',
        },
      ],
    };

const renderBuilder = (defaultValues: ActionPolicyFormState = DEFAULT_FORM_STATE) => {
  const TestComponent = () => {
    const methods = useForm<ActionPolicyFormState>({ defaultValues });
    return (
      <I18nProvider>
        <FormProvider {...methods}>
          <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="simpleWorkflowBuilderHost">
            <SimpleWorkflowBuilder />
          </EuiFlexGroup>
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

  it('renders nothing when there are no drafts', () => {
    renderBuilder();

    expect(screen.queryByTestId(/simpleWorkflowRow-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/inlineWorkflowEditor-/)).not.toBeInTheDocument();
  });

  it('renders nothing when workflows are disabled', () => {
    mockWorkflowsEnabled = false;
    renderBuilder({
      ...DEFAULT_FORM_STATE,
      inlineActions: [SEED_DRAFT],
    });

    expect(screen.queryByTestId(/simpleWorkflowRow-/)).not.toBeInTheDocument();
  });

  it('renders seeded drafts with an editable workflow name', () => {
    renderBuilder({
      ...DEFAULT_FORM_STATE,
      inlineActions: [SEED_DRAFT],
    });

    expect(screen.getByTestId('inlineWorkflowEditor-draft-1')).toBeInTheDocument();
    expect(screen.getByTestId('simpleWorkflowName-draft-1')).toHaveValue('Email notification');
  });

  it('closes a draft with the X control while creating', async () => {
    const user = userEvent.setup();
    renderBuilder({
      ...DEFAULT_FORM_STATE,
      inlineActions: [SEED_DRAFT],
    });

    expect(screen.getByTestId('inlineWorkflowEditor-draft-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close simple workflow draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove simple workflow' })).not.toBeInTheDocument();

    await user.click(screen.getByTestId('simpleWorkflowClose-draft-1'));
    expect(screen.queryByTestId(/inlineWorkflowEditor-/)).not.toBeInTheDocument();
  });

  it('collapses a draft when save simple workflow is clicked', async () => {
    const user = userEvent.setup();
    renderBuilder({
      ...DEFAULT_FORM_STATE,
      inlineActions: [SEED_DRAFT],
    });

    expect(screen.getByTestId('inlineWorkflowEditor-draft-1')).toBeInTheDocument();
    const saveButton = await screen.findByRole('button', { name: 'Save simple workflow' });
    expect(saveButton).toBeEnabled();
    await user.click(screen.getByTestId('simpleWorkflowConfirm-draft-1'));
    expect(screen.queryByTestId('inlineWorkflowEditor-draft-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('simpleWorkflowEdit-draft-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove simple workflow' })).toBeInTheDocument();
    expect(screen.getByText('Email notification')).toBeInTheDocument();
    expect(screen.queryByText('1 step')).not.toBeInTheDocument();
  });

  it('removes a saved draft with the trash control', async () => {
    const user = userEvent.setup();
    renderBuilder({
      ...DEFAULT_FORM_STATE,
      inlineActions: [SEED_DRAFT],
    });

    await user.click(screen.getByTestId('simpleWorkflowConfirm-draft-1'));
    await user.click(screen.getByTestId('simpleWorkflowRemove-draft-1'));
    expect(screen.queryByTestId(/simpleWorkflowRow-/)).not.toBeInTheDocument();
  });
});
