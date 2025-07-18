/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/dom';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import { AgentMigrateFlyout } from '.';

describe('MigrateAgentFlyout', () => {
  const renderer = createFleetTestRendererMock();
  let component: ReturnType<typeof renderer.render>;

  beforeEach(() => {
    // Reset the mocks before each test
    jest.clearAllMocks();

    component = renderer.render(
      <AgentMigrateFlyout
        onClose={jest.fn()}
        onSave={jest.fn()}
        agents={[
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '1',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        protectedAndFleetAgents={[]}
      />
    );
  });
  it('should render', () => {
    expect(component).toBeDefined();
  });

  it('submit button should be disabled when form is invalid', () => {
    // set the value of the url
    const urlInput = component.getByTestId('migrateAgentFlyoutClusterUrlInput');
    fireEvent.change(urlInput, { target: { value: 'somebadurl.com' } });

    const submitButton = component.getByTestId('migrateAgentFlyoutSubmitButton');

    expect(submitButton).toBeDisabled();
  });

  it('submit button should be enabled when form is valid', () => {
    // set the value of the url
    const urlInput = component.getByTestId('migrateAgentFlyoutClusterUrlInput');
    fireEvent.change(urlInput, { target: { value: 'https://www.example.com' } });
    //  also set the value of enrollment token
    const tokenInput = component.getByTestId('migrateAgentFlyoutEnrollmentTokenInput');
    fireEvent.change(tokenInput, { target: { value: 'someToken' } });
    const submitButton = component.getByTestId('migrateAgentFlyoutSubmitButton');

    expect(submitButton).not.toBeDisabled();
  });

  it('replace token button should be visible when there is one agent', () => {
    const replaceTokenButton = component.getByTestId('migrateAgentFlyoutReplaceTokenButton');
    expect(replaceTokenButton).toBeInTheDocument();
  });
  it('replace token button should not be visible when there is more than one agent', () => {
    component.rerender(
      <AgentMigrateFlyout
        onClose={jest.fn()}
        onSave={jest.fn()}
        agents={[
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '1',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '2',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        protectedAndFleetAgents={[]}
      />
    );
    const replaceTokenButton = component.queryByTestId('migrateAgentFlyoutReplaceTokenButton');
    expect(replaceTokenButton).not.toBeInTheDocument();
  });
  it('alert panel should be visible and show protected and or fleet-server agents when there are any', () => {
    component.rerender(
      <AgentMigrateFlyout
        onClose={jest.fn()}
        onSave={jest.fn()}
        agents={[
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '1',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
        protectedAndFleetAgents={[
          {
            active: true,
            status: 'online',
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
            id: '2',
            packages: [],
            type: 'PERMANENT',
            enrolled_at: new Date().toISOString(),
          },
        ]}
      />
    );
    const alertPanel = component.getByTestId('migrateAgentFlyoutAlertPanel');
    expect(alertPanel).toBeInTheDocument();
  });
  it('alert panel should not be visible when there are no protected or fleet-server agents', () => {
    const alertPanel = component.queryByTestId('migrateAgentFlyoutAlertPanel');
    expect(alertPanel).not.toBeInTheDocument();
  });
});
