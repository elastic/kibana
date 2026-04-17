/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { XmattersSeverityOptions } from '../types';
import XmattersParamsFields from './xmatters_params';

describe('XmattersParamsFields renders', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-01T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('all params fields is rendered', () => {
    const actionParams = {
      alertActionGroupName: 'Small t-shirt',
      signalId: 'c9437cab-6a5b-45e8-bc8a-f4a8af440e97',
      ruleName: 'Test xMatters',
      date: new Date().toISOString(),
      severity: XmattersSeverityOptions.HIGH,
      spaceId: 'default',
      tags: 'test1, test2',
    };

    render(
      <XmattersParamsFields
        actionParams={actionParams}
        errors={{
          alertActionGroupName: [],
          signalId: [],
          ruleName: [],
          date: [],
          spaceId: [],
        }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(screen.getByTestId('severitySelect')).toBeInTheDocument();
    expect(screen.getByTestId('tagsInput')).toBeInTheDocument();
    expect(screen.getByTestId('severitySelect')).toHaveValue('high');
    expect(screen.getByTestId('tagsInput')).toHaveValue('test1, test2');
  });

  test('default params for testing', () => {
    const actionParams = {};
    const editAction = jest.fn();

    render(
      <XmattersParamsFields
        actionParams={actionParams}
        errors={{
          alertActionGroupName: [],
          signalId: [],
          ruleName: [],
          date: [],
          spaceId: [],
        }}
        editAction={editAction}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    expect(editAction).toHaveBeenNthCalledWith(1, 'signalId', 'test-alert', 0);
    expect(editAction).toHaveBeenNthCalledWith(
      2,
      'alertActionGroupName',
      'test-rule:test-alert',
      0
    );
    expect(editAction).toHaveBeenNthCalledWith(3, 'ruleName', 'Test Rule', 0);
    expect(editAction).toHaveBeenNthCalledWith(4, 'date', '2022-01-01T12:00:00.000Z', 0);
    expect(editAction).toHaveBeenNthCalledWith(5, 'spaceId', 'test-space', 0);
  });
});
