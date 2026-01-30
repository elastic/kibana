/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import userEvent from '@testing-library/user-event';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { Agent } from '../../../../../types';

import { createPackagePolicyMock } from '../../../../../../../../common/mocks';

import { AgentDetailsIntegrationInputs } from './agent_details_integration_inputs';

describe('AgentDetailsIntegrationInputs', () => {
  const agent: Agent = {
    id: '123',
    packages: [],
    type: 'PERMANENT',
    active: true,
    enrolled_at: `${Date.now()}`,
    user_provided_metadata: {},
    local_metadata: {},
  };

  const packageMock = createPackagePolicyMock();

  const renderComponent = () => {
    const renderer = createFleetTestRendererMock();
    return renderer.render(
      <AgentDetailsIntegrationInputs agent={agent} packagePolicy={packageMock} />
    );
  };

  it('renders a default health icon when the agent has no components at all', async () => {
    const component = renderComponent();
    await userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthDefault')
    ).toBeInTheDocument();
  });

  it('renders a default health icon when the package input has no match in the agent component units', async () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
        units: [
          {
            id: 'endpoint-default',
            type: 'input',
            status: 'HEALTHY',
            message: 'Applied policy',
          },
        ],
      },
    ];

    const component = renderComponent();
    await userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthDefault')
    ).toBeInTheDocument();
  });

  it('renders a success health icon when the package input has a match in the agent component units', async () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
        units: [
          {
            id: `endpoint-default-${packageMock.id}`,
            type: 'input',
            status: 'HEALTHY',
            message: 'Applied policy',
          },
        ],
      },
    ];

    const component = renderComponent();
    await userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.getByTestId('agentDetailsIntegrationsInputStatusHealthSuccess')
    ).toBeInTheDocument();
  });

  it('does not render when there is no units array', async () => {
    agent.components = [
      {
        id: 'endpoint-default',
        type: 'endpoint',
        status: 'HEALTHY',
        message: 'Healthy',
      },
    ];

    const component = renderComponent();
    await userEvent.click(component.getByTestId('agentIntegrationsInputsTitle'));
    expect(
      component.queryByTestId('agentDetailsIntegrationsInputStatusHealthSuccess')
    ).not.toBeInTheDocument();
  });

  it('should not throw error when there is no components', async () => {
    agent.components = undefined;

    const component = renderComponent();
    await userEvent.click(component.container.querySelector('#agentIntegrationsItems')!);
    await userEvent.click(component.container.querySelector('#endpoint')!);
    expect(component.getByText('Endpoint')).toBeInTheDocument();
  });

  it('should render input type using input id for otelcol inputs', async () => {
    packageMock.inputs.push({
      type: 'otelcol',
      enabled: true,
      streams: [],
      id: 'otelcol/my-otelcol-input',
    });

    const component = renderComponent();
    await userEvent.click(component.container.querySelector('#agentIntegrationsItems')!);
    await userEvent.click(component.container.querySelector('#otelcol')!);
    expect(component.getByText('otelcol/my-otelcol-input')).toBeInTheDocument();
  });

  it('should render input type using input type for non-otelcol inputs', async () => {
    packageMock.inputs.push({
      type: 'logfile',
      enabled: true,
      streams: [],
      id: 'logfile/my-logfile-input',
    });

    const component = renderComponent();
    await userEvent.click(component.container.querySelector('#agentIntegrationsItems')!);
    await userEvent.click(component.container.querySelector('#logfile')!);
    expect(component.getByText('Logs')).toBeInTheDocument();
  });
});
