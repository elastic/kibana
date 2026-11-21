/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
jest.mock('./service_agent_status', () => ({
  ServiceAgentStatus: () => <div data-test-subj="mockAgentStatus" />,
}));

import { ServiceTile } from './service_tile';
import type { ServiceAgentInfo } from '../use_service_data_detection';
import type { AwsServiceMatrixEntry } from '../../../aws_service_matrix';
import type { ServiceChipState } from '../../../onboarding_flow_context';

const ENTRY = {
  id: 'config',
  name: 'AWS Config',
  packageName: 'aws',
  dataStreams: ['config'],
  signalTypes: ['logs'],
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  defaultEnabled: true,
  defaultEnabledInputs: [],
  showInUI: true,
} as unknown as AwsServiceMatrixEntry;

function renderTile(status: ServiceChipState, agentInfo?: ServiceAgentInfo) {
  return render(
    <I18nProvider>
      <ServiceTile
        name="AWS Config"
        status={status}
        entry={ENTRY}
        deploymentMethod="managed_integration"
        agentInfo={agentInfo}
      />
    </I18nProvider>
  );
}

const AGENT_INFO = (health: ServiceAgentInfo['health'], issue?: ServiceAgentInfo['issue']) =>
  ({ health, agentIds: [], liveAgentIds: [], policyId: 'p1', issue } as ServiceAgentInfo);

describe('ServiceTile', () => {
  it('renders the service name', () => {
    renderTile('receiving');
    expect(screen.getByText('AWS Config')).toBeInTheDocument();
  });

  describe('leading indicator', () => {
    it.each<ServiceChipState>(['instantiating', 'detecting'])(
      'shows a spinner while %s',
      (status) => {
        const { container } = renderTile(status);
        expect(screen.getByTestId('serviceTile-spinner')).toBeInTheDocument();
        // No terminal-state icon alongside the spinner.
        expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      }
    );

    it('shows a success icon once receiving', () => {
      const { container } = renderTile('receiving');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).not.toBeNull();
    });

    it('does not show a success icon on error', () => {
      const { container } = renderTile('error');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      expect(container.querySelector('[data-euiicon-type="errorFill"]')).not.toBeNull();
    });

    it('does not show a success icon on timeout', () => {
      const { container } = renderTile('timeout');
      expect(screen.queryByTestId('serviceTile-spinner')).not.toBeInTheDocument();
      expect(container.querySelector('[data-euiicon-type="checkCircle"]')).toBeNull();
      expect(container.querySelector('[data-euiicon-type="warning"]')).not.toBeNull();
    });
  });

  it('renders exactly one loading indicator while pending', () => {
    const { container } = renderTile('detecting');
    expect(container.querySelectorAll('.euiLoadingSpinner')).toHaveLength(1);
  });

  describe('agent status', () => {
    it('shows no agent status for a service without a Fleet agent (ECF)', () => {
      renderTile('receiving');
      expect(screen.queryByTestId('mockAgentStatus')).not.toBeInTheDocument();
    });

    it('shows the agent status for a service deployed through Fleet', () => {
      renderTile('detecting', AGENT_INFO('healthy'));
      expect(screen.getByTestId('mockAgentStatus')).toBeInTheDocument();
    });

    it('blames the agent when an unhealthy agent causes the error', () => {
      renderTile('error', AGENT_INFO('unhealthy'));
      expect(screen.getByText('Agent needs attention')).toBeInTheDocument();
    });

    it('asks for an upgrade when the agent is too old for the integration', () => {
      renderTile(
        'error',
        AGENT_INFO('unhealthy', {
          type: 'incompatible_version',
          agentVersion: '8.18.0',
          minVersion: '9.4.0',
          integrations: ['AWS'],
        })
      );
      expect(screen.getByText('Agent upgrade required')).toBeInTheDocument();
    });

    it('says the integration is not running when the agent runs none of it', () => {
      renderTile('error', AGENT_INFO('unhealthy', { type: 'not_running' }));
      expect(screen.getByText("Integration isn't running")).toBeInTheDocument();
    });

    it('keeps the deployment failure wording when there is no unhealthy agent', () => {
      renderTile('error');
      expect(screen.getByText('Deployment failed')).toBeInTheDocument();

      renderTile('error', AGENT_INFO('healthy'));
      expect(screen.getAllByText('Deployment failed')).toHaveLength(2);
    });

    it('shows the error icon for an unhealthy agent', () => {
      const { container } = renderTile('error', AGENT_INFO('unhealthy'));
      expect(container.querySelector('[data-euiicon-type="errorFill"]')).not.toBeNull();
    });

    it('keeps the spinner while a healthy agent has not produced data yet', () => {
      renderTile('detecting', AGENT_INFO('healthy'));
      expect(screen.getByTestId('serviceTile-spinner')).toBeInTheDocument();
    });
  });
});
