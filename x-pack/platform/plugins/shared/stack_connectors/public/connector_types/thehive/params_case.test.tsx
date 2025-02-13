/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import TheHiveParamsFields from './params';
import { SUB_ACTION } from '../../../common/thehive/constants';
import { ExecutorParams, ExecutorSubActionPushParams } from '../../../common/thehive/types';

describe('TheHiveParamsFields renders', () => {
  const subActionParams: ExecutorSubActionPushParams = {
    incident: {
      title: 'title {test}',
      description: 'test description',
      tlp: 2,
      severity: 2,
      tags: ['test1'],
      externalId: null,
    },
    comments: [],
  };
  const actionParams: ExecutorParams = {
    subAction: SUB_ACTION.PUSH_TO_SERVICE,
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
    const { getByTestId } = render(<TheHiveParamsFields {...defaultProps} />);

    expect(getByTestId('titleInput')).toBeInTheDocument();
    expect(getByTestId('descriptionTextArea')).toBeInTheDocument();
    expect(getByTestId('tagsInput')).toBeInTheDocument();
    expect(getByTestId('severitySelectInput')).toBeInTheDocument();
    expect(getByTestId('tlpSelectInput')).toBeInTheDocument();
    expect(getByTestId('commentsTextArea')).toBeInTheDocument();

    expect(getByTestId('severitySelectInput')).toHaveValue('2');
    expect(getByTestId('tlpSelectInput')).toHaveValue('2');
  });
});
