/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SUB_ACTION } from '@kbn/connector-schemas/crowdstrike/constants';
import type { CrowdstrikeActionParams } from '@kbn/connector-schemas/crowdstrike';
import CrowdstrikeParamsFields from './crowdstrike_params';

const actionParams = {
  subAction: SUB_ACTION.GET_AGENT_DETAILS,
  subActionParams: {
    ids: ['test'],
  },
} as unknown as CrowdstrikeActionParams;

describe('CrowdstrikeParamsFields renders', () => {
  test('all params fields are rendered', () => {
    render(
      <CrowdstrikeParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={jest.fn()}
        index={0}
        messageVariables={[]}
      />
    );
    const actionTypeSelect = screen.getByTestId('actionTypeSelect');
    expect(actionTypeSelect).toBeInTheDocument();
    expect(actionTypeSelect).toBeDisabled();
    expect(screen.getByTestId('agentIdSelect')).toBeInTheDocument();
  });
});
