/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OpsgenieParamFields from './params';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public';
import { OpsgenieSubActions } from '../../../common';
import type { OpsgenieActionParams } from '../../../server/connector_types';

describe('OpsgenieParamFields', () => {
  const editAction = jest.fn();
  const createAlertActionParams: OpsgenieActionParams = {
    subAction: OpsgenieSubActions.CreateAlert,
    subActionParams: { message: 'hello', alias: '123' },
  };

  const closeAlertActionParams: OpsgenieActionParams = {
    subAction: OpsgenieSubActions.CloseAlert,
    subActionParams: { alias: '456' },
  };

  const connector = {
    secrets: { apiKey: '123' },
    config: { apiUrl: 'http://test.com' },
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    isPreconfigured: false,
    isSystemAction: false as const,
    isDeprecated: false,
  };

  const defaultCreateAlertProps = {
    actionParams: createAlertActionParams,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
    executionMode: ActionConnectorMode.Test,
  };

  const defaultCloseAlertProps = {
    actionParams: closeAlertActionParams,
    errors: {
      'subActionParams.message': [],
      'subActionParams.alias': [],
    },
    editAction,
    index: 0,
    messageVariables: [],
    actionConnector: connector,
    executionMode: ActionConnectorMode.Test,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the create alert component', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-subActionSelect'));

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
  });

  it('renders the close alert component', async () => {
    render(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.getByTestId('opsgenie-subActionSelect'));

    expect(screen.queryByDisplayValue('hello')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('123')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('456')).toBeInTheDocument();
  });

  it('does not render the sub action select for creating an alert when execution mode is ActionForm', async () => {
    render(
      <OpsgenieParamFields
        {...{ ...defaultCreateAlertProps, executionMode: ActionConnectorMode.ActionForm }}
      />
    );

    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Alias')).toBeInTheDocument();
    expect(screen.queryByTestId('opsgenie-subActionSelect')).not.toBeInTheDocument();

    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('does not render the sub action select for closing an alert when execution mode is ActionForm', async () => {
    render(
      <OpsgenieParamFields
        {...{ ...defaultCloseAlertProps, executionMode: ActionConnectorMode.ActionForm }}
      />
    );

    expect(screen.queryByTestId('opsgenie-subActionSelect')).not.toBeInTheDocument();
  });

  it('does not render the sub action select for closing an alert when execution mode is undefined', async () => {
    render(<OpsgenieParamFields {...{ ...defaultCloseAlertProps, executionMode: undefined }} />);

    expect(screen.queryByTestId('opsgenie-subActionSelect')).not.toBeInTheDocument();
  });

  it('calls editAction when the message field is changed', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    fireEvent.change(screen.getByDisplayValue('hello'), { target: { value: 'a new message' } });

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "123",
          "message": "a new message",
        },
        0,
      ]
    `);
  });

  it('calls editAction when the description field is changed', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    fireEvent.change(screen.getByTestId('descriptionTextArea'), {
      target: { value: 'a new description' },
    });

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "123",
          "description": "a new description",
          "message": "hello",
        },
        0,
      ]
    `);
  });

  it('calls editAction when the alias field is changed for closeAlert', async () => {
    render(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    fireEvent.change(screen.getByDisplayValue('456'), { target: { value: 'a new alias' } });

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "a new alias",
        },
        0,
      ]
    `);
  });

  it('does not render the create or close alert components if the subAction is undefined', async () => {
    render(<OpsgenieParamFields {...{ ...defaultCreateAlertProps, actionParams: {} }} />);

    expect(screen.queryByTestId('opsgenie-alias-row')).not.toBeInTheDocument();
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('does not call edit action when a component rerenders with subActionParams that match the new subAction', async () => {
    const { rerender } = render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('123'), { target: { value: 'a new alias' } });
    expect(editAction).toBeCalledTimes(1);

    rerender(
      <OpsgenieParamFields
        {...{
          ...defaultCloseAlertProps,
          actionParams: {
            ...defaultCloseAlertProps.actionParams,
            subActionParams: {
              alias: 'a new alias',
            },
          },
        }}
      />
    );

    expect(screen.queryByDisplayValue('hello')).not.toBeInTheDocument();

    expect(editAction).toBeCalledTimes(1);
  });

  it('calls editAction with only the alias when the component is rerendered with mismatched closeAlert and params', async () => {
    const { rerender } = render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();

    rerender(
      // @ts-expect-error upgrade typescript v4.9.5
      <OpsgenieParamFields
        {...{
          ...defaultCloseAlertProps,
          actionParams: {
            ...defaultCloseAlertProps.actionParams,
            subActionParams: {
              alias: 'a new alias',
              message: 'a message',
            },
          },
        }}
      />
    );

    expect(screen.queryByDisplayValue('hello')).not.toBeInTheDocument();

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "a new alias",
        },
        0,
      ]
    `);
  });

  it('calls editAction with only the alias when the component is rerendered with mismatched createAlert and params', async () => {
    const { rerender } = render(<OpsgenieParamFields {...defaultCloseAlertProps} />);

    expect(screen.queryByText('Message')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('456')).toBeInTheDocument();

    rerender(
      // @ts-expect-error upgrade typescript v4.9.5
      <OpsgenieParamFields
        {...{
          ...defaultCreateAlertProps,
          actionParams: {
            ...defaultCreateAlertProps.actionParams,
            subActionParams: {
              message: 'a message',
              alias: 'a new alias',
              invalidField: 'a note',
            },
          },
        }}
      />
    );

    expect(screen.queryByDisplayValue('456')).not.toBeInTheDocument();

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "subActionParams",
        Object {
          "alias": "a new alias",
        },
        0,
      ]
    `);
  });

  it('only preserves the previous alias value when switching between the create and close alert event actions', async () => {
    const { rerender } = render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('123'), { target: { value: 'a new alias' } });
    expect(editAction).toBeCalledTimes(1);

    rerender(
      // @ts-expect-error upgrade typescript v4.9.5
      <OpsgenieParamFields
        {...{
          ...defaultCloseAlertProps,
          actionParams: {
            ...defaultCloseAlertProps.actionParams,
            subActionParams: {
              message: 'hello',
              alias: 'a new alias',
            },
          },
        }}
      />
    );

    expect(screen.queryByDisplayValue('hello')).not.toBeInTheDocument();

    expect(editAction).toBeCalledTimes(2);

    expect(editAction.mock.calls[1]).toMatchInlineSnapshot(`
          Array [
            "subActionParams",
            Object {
              "alias": "a new alias",
            },
            0,
          ]
      `);
  });

  it('calls editAction when changing the subAction', async () => {
    render(<OpsgenieParamFields {...defaultCreateAlertProps} />);

    await userEvent.selectOptions(
      screen.getByTestId('opsgenie-subActionSelect'),
      screen.getByText('Close alert')
    );

    expect(editAction).toBeCalledTimes(1);
    expect(editAction.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            "subAction",
            "closeAlert",
            0,
          ]
      `);
  });
});
