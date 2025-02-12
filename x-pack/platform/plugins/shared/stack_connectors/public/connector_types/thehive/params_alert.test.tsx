/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { TheHiveParamsAlertFields } from './params_alert';
import { SUB_ACTION, TheHiveSeverity, TheHiveTemplate } from '../../../common/thehive/constants';
import { ExecutorParams, ExecutorSubActionCreateAlertParams } from '../../../common/thehive/types';
import { bodyOption } from './constants';

describe('TheHiveParamsFields renders', () => {
  const subActionParams: ExecutorSubActionCreateAlertParams = {
    title: 'title {test}',
    description: 'description test',
    tlp: 2,
    severity: 2,
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
    expect(getByTestId('rule-severity-toggle')).toBeInTheDocument();
    expect(getByTestId('severitySelectInput')).toBeInTheDocument();
    expect(getByTestId('tlpSelectInput')).toBeInTheDocument();
    expect(getByTestId('typeInput')).toBeInTheDocument();
    expect(getByTestId('sourceInput')).toBeInTheDocument();
    expect(getByTestId('sourceRefInput')).toBeInTheDocument();
    expect(getByTestId('bodyTemplateSelectButton')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();

    expect(getByTestId('severitySelectInput')).toHaveValue('2');
    expect(getByTestId('rule-severity-toggle')).not.toBeChecked();
    expect(getByTestId('tlpSelectInput')).toHaveValue('2');
    expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '');
  });

  it('hides the severity select input when rule severity is enabled', () => {
    const { getByTestId } = render(<TheHiveParamsAlertFields {...defaultProps} />);
    const ruleSeverityToggleEl = getByTestId('rule-severity-toggle');

    fireEvent.click(ruleSeverityToggleEl);
    expect(getByTestId('rule-severity-toggle')).toBeEnabled();
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { ...subActionParams, severity: TheHiveSeverity.RULE_SEVERITY },
      0
    );

    expect(screen.queryByTestId('severitySelectInput')).not.toBeInTheDocument();
  });

  it('changes the content of json editor when template is selected', () => {
    const { getByTestId } = render(<TheHiveParamsAlertFields {...defaultProps} />);
    const templateSelectButton = getByTestId('bodyTemplateSelectButton');

    fireEvent.click(templateSelectButton);
    const templateToSelect = getByTestId('Compromised User Account Investigation-selectableOption');

    fireEvent.click(templateToSelect, {
      target: { value: TheHiveTemplate.COMPROMISED_USER_ACCOUNT_INVESTIGATION },
    });
    expect(editAction).toHaveBeenNthCalledWith(
      1,
      'subActionParams',
      {
        ...subActionParams,
        body: bodyOption[TheHiveTemplate.COMPROMISED_USER_ACCOUNT_INVESTIGATION],
      },
      0
    );
  });
});
