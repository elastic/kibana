/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TheHiveParamsAlertFields } from './params_alert';
import { SUB_ACTION } from '../../../common/thehive/constants';
import { ExecutorParams, ExecutorSubActionCreateAlertParams } from '../../../common/thehive/types';
import userEvent from '@testing-library/user-event';

describe('TheHiveParamsFields renders', () => {
  const subActionParams: ExecutorSubActionCreateAlertParams = {
    title: 'title {test}',
    description: 'description test',
    tlp: 2,
    severity: 2,
    isRuleSeverity: false,
    tags: ['test1'],
    source: 'source test',
    type: 'sourceType test',
    sourceRef: 'sourceRef test',
    body: null,
  };
  const actionParams: ExecutorParams = {
    subAction: SUB_ACTION.CREATE_ALERT,
    subActionParams,
  };
  const connector: ActionConnector = {
    secrets: {},
    config: {},
    id: 'test',
    actionTypeId: '.test',
    name: 'Test',
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false as const,
  };

  const editAction = jest.fn();
  const defaultProps = {
    actionConnector: connector,
    actionParams,
    editAction,
    errors: { 'subActionParams.incident.title': [] },
    index: 0,
    messageVariables: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('all Params fields is rendered', () => {
    const { getByTestId } = render(<TheHiveParamsAlertFields {...defaultProps} />);

    expect(getByTestId('titleInput')).toBeInTheDocument();
    expect(getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(getByTestId('tagsInput')).toBeInTheDocument();
    expect(getByTestId('severitySelectInput')).toBeInTheDocument();
    expect(getByTestId('rule-severity-toggle')).toBeInTheDocument();
    expect(getByTestId('tlpSelectInput')).toBeInTheDocument();
    expect(getByTestId('typeInput')).toBeInTheDocument();
    expect(getByTestId('sourceInput')).toBeInTheDocument();
    expect(getByTestId('sourceRefInput')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();

    expect(getByTestId('severitySelectInput')).toHaveValue('2');
    expect(getByTestId('tlpSelectInput')).toHaveValue('2');
    expect(getByTestId('rule-severity-toggle')).not.toBeChecked();
  });

  it('hides the severity select input when rule severity toggle is enabled', () => {
    const { getByTestId } = render(<TheHiveParamsAlertFields {...defaultProps} />);
    const ruleSeverityToggleEl = getByTestId('rule-severity-toggle');

    fireEvent.click(ruleSeverityToggleEl);
    expect(getByTestId('rule-severity-toggle')).toBeEnabled();
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { ...subActionParams, severity: 2, isRuleSeverity: true },
      0
    );

    expect(screen.queryByTestId('severitySelectInput')).not.toBeInTheDocument();
  });

  it('should updates body content', async () => {
    const bodyValue = JSON.stringify({ bar: 'test' });
    render(<TheHiveParamsAlertFields {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('bodyJsonEditor'));
    await userEvent.paste(bodyValue);

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        { ...subActionParams, body: bodyValue },
        0
      );
    });
  });
});
