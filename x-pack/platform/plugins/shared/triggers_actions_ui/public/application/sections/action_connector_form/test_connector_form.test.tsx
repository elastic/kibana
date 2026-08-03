/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import TestConnectorForm from './test_connector_form';
import { none, some } from 'fp-ts/Option';
import type { ActionConnector, ActionParamsProps, GenericValidationResult } from '../../../types';
import { ActionConnectorMode } from '../../../types';
import { EuiFormRow, EuiFieldText, EuiText, EuiLink, EuiForm, EuiSelect } from '@elastic/eui';
import { screen } from '@testing-library/react';
jest.mock('../../../common/lib/kibana');

const mockedActionParamsFields = lazy(async () => ({
  default() {
    return (
      <EuiForm component="form">
        <EuiFormRow label="Text field" helpText="I am some friendly help text.">
          <EuiFieldText data-test-subj="testInputField" />
        </EuiFormRow>

        <EuiFormRow
          label="Select (with no initial selection)"
          labelAppend={
            <EuiText size="xs">
              <EuiLink>Link to some help</EuiLink>
            </EuiText>
          }
        >
          <EuiSelect
            hasNoInitialSelection
            options={[
              { value: 'option_one', text: 'Option one' },
              { value: 'option_two', text: 'Option two' },
              { value: 'option_three', text: 'Option three' },
            ]}
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
}));

const actionType = {
  id: 'my-action-type',
  iconClass: 'test',
  selectMessage: 'test',
  validateParams: (): Promise<GenericValidationResult<unknown>> => {
    const validationResult = { errors: {} };
    return Promise.resolve(validationResult);
  },
  actionConnectorFields: null,
  actionParamsFields: mockedActionParamsFields,
};

const ExecutionModeComponent: React.FC<Pick<ActionParamsProps<{}>, 'executionMode'>> = ({
  executionMode,
}) => {
  return (
    <EuiForm component="form">
      <EuiFormRow label="Execution mode" helpText="Execution mode help text.">
        <>
          {executionMode === ActionConnectorMode.Test && (
            <EuiFieldText data-test-subj="executionModeFieldTest" />
          )}
          {executionMode === ActionConnectorMode.ActionForm && (
            <EuiFieldText data-test-subj="executionModeFieldActionForm" />
          )}
          {executionMode === undefined && (
            <EuiFieldText data-test-subj="executionModeFieldUndefined" />
          )}
        </>
      </EuiFormRow>
    </EuiForm>
  );
};

const mockedActionParamsFieldsExecutionMode = lazy(async () => ({
  default: ({ executionMode }: { executionMode?: ActionConnectorMode }) => {
    return <ExecutionModeComponent executionMode={executionMode} />;
  },
}));

describe('test_connector_form', () => {
  it('renders initially as the action form and execute button and no result', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={none}
        actionTypeModel={actionType}
      />
    );
    const executeActionButton = screen.getByTestId('executeActionButton');
    expect(executeActionButton).toBeInTheDocument();
    expect(executeActionButton).not.toBeDisabled();

    expect(screen.getByTestId('executionAwaiting')).toBeInTheDocument();
  });

  it('renders the execution test field', async () => {
    const actionTypeExecutionMode = {
      id: 'execution-mode-type',
      iconClass: 'test',
      selectMessage: 'test',
      validateParams: (): Promise<GenericValidationResult<unknown>> => {
        const validationResult = { errors: {} };
        return Promise.resolve(validationResult);
      },
      actionConnectorFields: null,
      actionParamsFields: mockedActionParamsFieldsExecutionMode,
    };
    const connector = {
      actionTypeId: actionTypeExecutionMode.id,
      config: {},
      secrets: {},
    } as ActionConnector;

    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={none}
        actionTypeModel={actionTypeExecutionMode}
      />
    );

    expect(await screen.findByTestId('executionModeFieldTest')).toBeInTheDocument();
    expect(screen.queryByTestId('executionModeFieldActionForm')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executionModeFieldUndefined')).not.toBeInTheDocument();
  });

  it('renders successful results', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={some({
          actionId: '',
          status: 'ok',
        })}
        actionTypeModel={actionType}
      />
    );
    expect(screen.getByTestId('executionSuccessfulResult')).toBeInTheDocument();
  });

  it('renders failure results', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={some({
          actionId: '',
          status: 'error',
          message: 'Error Message',
        })}
        actionTypeModel={actionType}
      />
    );
    expect(screen.getByTestId('executionFailureResult')).toBeInTheDocument();
  });

  it('renders code block if there is a execution result', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={some({
          actionId: '1234',
          status: 'ok',
        })}
        actionTypeModel={actionType}
      />
    );

    const result = screen.getByTestId('executionResultCodeBlock');
    expect(result).toBeInTheDocument();
    expect(result.textContent).toEqual(
      JSON.stringify(
        {
          actionId: '1234',
          status: 'ok',
        },
        null,
        2
      )
    );
  });

  it('hides the create action step when hideActionParamsStep is true', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={none}
        actionTypeModel={actionType}
        hideActionParamsStep={true}
      />
    );

    expect(screen.queryByText('Create an action')).not.toBeInTheDocument();
    expect(screen.getByText('Run the test')).toBeInTheDocument();
    expect(screen.getByTestId('executeActionButton')).toBeInTheDocument();
  });

  it('does not render the code block if there is no execution result', async () => {
    const connector = {
      actionTypeId: actionType.id,
      config: {},
      secrets: {},
    } as ActionConnector;
    renderWithI18n(
      <TestConnectorForm
        connector={connector}
        executeEnabled={true}
        actionParams={{}}
        onEditAction={() => {}}
        isExecutingAction={false}
        onExecutionAction={async () => {}}
        executionResult={some(undefined)}
        actionTypeModel={actionType}
      />
    );

    expect(screen.queryByTestId('executionResultCodeBlock')).not.toBeInTheDocument();
  });
});
