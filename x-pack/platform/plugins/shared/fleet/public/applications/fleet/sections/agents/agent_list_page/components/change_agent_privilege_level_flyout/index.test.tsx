/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import { ChangeAgentPrivilegeLevelFlyout } from '.';

describe('ChangeAgentPrivilegeLevelFlyout', () => {
  const renderer = createFleetTestRendererMock();
  let component: ReturnType<typeof renderer.render>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the alert panel when there are unsupported agents', () => {
    component = renderer.render(
      <ChangeAgentPrivilegeLevelFlyout
        agents={[
          {
            id: '123',
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '9.3.0' } } },
            agent: { id: '123', version: '9.3.0' },
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        agentCount={1}
        unsupportedAgents={[
          {
            id: '123',
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '9.3.0' } } },
            agent: { id: '123', version: '9.3.0' },
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    const alertPanel = component.getByTestId('changeAgentPrivilegeLevelFlyoutAlertPanel');
    expect(alertPanel).toBeInTheDocument();
    const submitButton = component.getByTestId('changeAgentPrivilegeLevelFlyoutSubmitButton');
    expect(submitButton.textContent).toEqual('Remove privilege for 0 agents');
    expect(submitButton).toBeDisabled();
  });

  it('should not render the alert panel when there are no unsupported agents', () => {
    component = renderer.render(
      <ChangeAgentPrivilegeLevelFlyout
        agents={[
          {
            id: '123',
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '9.3.0' } } },
            agent: { id: '123', version: '9.3.0' },
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        agentCount={1}
        unsupportedAgents={[]}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );

    const alertPanel = component.queryByTestId('changeAgentPrivilegeLevelFlyoutAlertPanel');
    expect(alertPanel).not.toBeInTheDocument();
    const submitButton = component.getByTestId('changeAgentPrivilegeLevelFlyoutSubmitButton');
    expect(submitButton.textContent).toEqual('Remove privilege for 1 agent');
    expect(submitButton).not.toBeDisabled();
  });
});
