/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import D3ParamsFields from './params';
import { SUB_ACTION } from '../../../common/d3security/constants';

const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];
describe('D3SecurityParamsFields renders', () => {
  it('all params fields is rendered', () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: 'test message',
        severity: 'test severity',
        eventType: 'test type',
      },
    };

    const { getByTestId } = render(
      <D3ParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
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
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', 'test message');
    expect(getByTestId('bodyAddVariableButton')).toBeInTheDocument();
  });

  it('calls editAction function with the correct arguments ', () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId, rerender } = render(
      <D3ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"}' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
    rerender(
      <D3ParamsFields
        actionParams={{ ...actionParams, subActionParams: { body: '{"new_key": "new_value"}' } }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />
    );
    fireEvent.change(getByTestId('severityInput'), { target: { value: 'cool rad' } });
    expect(editAction).toHaveBeenNthCalledWith(
      2,
      'subActionParams',
      { body: '{"new_key": "new_value"}', severity: 'cool rad' },
      0
    );
  });

  it('handles the case when subAction only is undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: {
        body: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};
    render(
      <D3ParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });
});
