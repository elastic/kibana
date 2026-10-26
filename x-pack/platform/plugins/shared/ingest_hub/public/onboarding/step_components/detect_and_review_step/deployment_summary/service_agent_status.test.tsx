/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/fleet-plugin/public', () => ({
  // Fleet's badge shows its tooltip on hover; the mock renders the extra content right away.
  LazyAgentStatusBadge: ({
    agent,
    tooltipExtraContent,
    onClick,
    'data-test-subj': dataTestSubj,
  }: {
    agent?: { status: string };
    tooltipExtraContent?: React.ReactNode;
    onClick?: () => void;
    'data-test-subj'?: string;
  }) => {
    const label = agent ? <span data-test-subj="agentHealth">{agent.status}</span> : 'Pending';
    return (
      <span>
        {onClick ? (
          <button type="button" onClick={onClick} data-test-subj={dataTestSubj}>
            {label}
          </button>
        ) : (
          <span data-test-subj={dataTestSubj}>{label}</span>
        )}
        {tooltipExtraContent && <span data-test-subj="agentTooltip">{tooltipExtraContent}</span>}
      </span>
    );
  },
  LazyAgentlessStatusDetailsFlyout: (props: {
    onClose: () => void;
    policyName: string;
    agent: { id: string };
    packagePolicy: { id: string };
  }) => (
    <div data-test-subj="detailsFlyout">
      {props.policyName}|{props.agent.id}|{props.packagePolicy.id}
      <button type="button" onClick={props.onClose}>
        close-details
      </button>
    </div>
  ),
  LazyAgentlessEnrollmentFlyout: (props: {
    onClose: () => void;
    policyId: string;
    policyName: string;
    packageInfo: { name: string; version: string };
  }) => (
    <div data-test-subj="enrollmentFlyout">
      {props.policyName}|{props.policyId}|{props.packageInfo.name}@{props.packageInfo.version}
      <button type="button" onClick={props.onClose}>
        close-enrollment
      </button>
    </div>
  ),
}));

import type { AwsServiceMatrixEntry, DeploymentMethod } from '../../../aws_service_matrix';
import type { ServiceAgentInfo } from '../use_service_data_detection';
import { ServiceAgentStatus } from './service_agent_status';

const ENTRY = { id: 's3', name: 'Amazon S3', packageName: 'aws' } as AwsServiceMatrixEntry;
const PACKAGE_POLICY = { id: 'pp-1', package: { name: 'aws', version: '4.0.0' } };
const AGENT_POLICY = { id: 'ap-1' };

const info = (overrides: Partial<ServiceAgentInfo> = {}) =>
  ({
    health: 'healthy',
    agent: { id: 'a1', status: 'online' },
    agentIds: ['a1'],
    policyId: 'policy-1',
    agentPolicy: AGENT_POLICY,
    packagePolicy: PACKAGE_POLICY,
    ...overrides,
  } as unknown as ServiceAgentInfo);

const renderStatus = (
  agentInfo: ServiceAgentInfo,
  deploymentMethod: DeploymentMethod = 'managed_integration'
) =>
  render(
    <I18nProvider>
      <ServiceAgentStatus
        name="Amazon S3"
        entry={ENTRY}
        deploymentMethod={deploymentMethod}
        agentInfo={agentInfo}
      />
    </I18nProvider>
  );

describe('ServiceAgentStatus', () => {
  describe('healthy and in-progress agents', () => {
    it('renders the Fleet agent badge as a button, so the per-input health can be reached', () => {
      renderStatus(info());

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('online');
      expect(screen.getByTestId('serviceTile-agentStatusButton').tagName).toBe('BUTTON');
      expect(screen.getByTestId('agentTooltip')).toHaveTextContent('See agent info');
    });

    it('opens the component health flyout for a healthy agent', async () => {
      renderStatus(info());

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('detailsFlyout')).toHaveTextContent('Amazon S3|a1|pp-1');
    });

    it('is not clickable until the package policy is known', () => {
      renderStatus({ ...info(), packagePolicy: undefined });

      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentTooltip')).not.toBeInTheDocument();
    });

    it('is not clickable while the agent is still enrolling', () => {
      renderStatus(info({ health: 'pending', agent: { id: 'a1', status: 'enrolling' } as never }));

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('enrolling');
      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentTooltip')).not.toBeInTheDocument();
    });
  });

  describe('an unhealthy agent', () => {
    const unhealthy = () =>
      info({ health: 'unhealthy', agent: { id: 'a1', status: 'error' } as never });

    it('makes the badge a button and adds "See agent info" to the check-in tooltip', () => {
      renderStatus(unhealthy());

      expect(screen.getByTestId('serviceTile-agentStatusButton').tagName).toBe('BUTTON');
      expect(screen.getByTestId('agentTooltip')).toHaveTextContent('See agent info');
    });

    it('opens the component health flyout with the agent and its package policy', async () => {
      renderStatus(unhealthy());
      expect(screen.queryByTestId('detailsFlyout')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('detailsFlyout')).toHaveTextContent('Amazon S3|a1|pp-1');
      expect(screen.queryByTestId('enrollmentFlyout')).not.toBeInTheDocument();
    });

    it('closes the flyout', async () => {
      renderStatus(unhealthy());
      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));
      fireEvent.click(await screen.findByText('close-details'));

      expect(screen.queryByTestId('detailsFlyout')).not.toBeInTheDocument();
    });

    it('does the same for agent-based deployments', async () => {
      renderStatus(unhealthy(), 'agent_based');

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('detailsFlyout')).toBeInTheDocument();
    });

    it('is not clickable until the package policy is known, and promises no flyout', () => {
      renderStatus({ ...unhealthy(), packagePolicy: undefined });

      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentTooltip')).not.toBeInTheDocument();
    });
  });

  describe('an agent that cannot run the integration', () => {
    const withIssue = (issue: ServiceAgentInfo['issue']) =>
      info({
        health: 'unhealthy',
        agent: { id: 'a1', status: 'online' } as never,
        issue,
      });
    const INCOMPATIBLE = {
      type: 'incompatible_version' as const,
      agentVersion: '8.18.0',
      minVersion: '9.4.0',
      integrations: ['AWS', 'AWS CloudWatch'],
    };

    it('shows the badge as unhealthy even though Fleet reports the agent online', () => {
      renderStatus(withIssue(INCOMPATIBLE));

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('degraded');
    });

    it('still opens the flyout with the real agent, not the relabelled one', async () => {
      renderStatus(withIssue(INCOMPATIBLE));

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('detailsFlyout')).toHaveTextContent('Amazon S3|a1|pp-1');
    });

    it('explains what to upgrade to in the tooltip', () => {
      renderStatus(withIssue(INCOMPATIBLE));

      expect(
        screen.getByText(
          'Upgrade the agent to 9.4.0 or later to run AWS, AWS CloudWatch. This agent is on 8.18.0.'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('See agent info')).toBeInTheDocument();
    });

    it('still explains the upgrade when Fleet does not record a minimum version', () => {
      renderStatus(withIssue({ ...INCOMPATIBLE, minVersion: undefined, integrations: ['AWS'] }));

      expect(
        screen.getByText("This agent is on 8.18.0, which can't run AWS. Upgrade the agent.")
      ).toBeInTheDocument();
    });

    it('says so when the agent is not running the integration', () => {
      renderStatus(withIssue({ type: 'not_running' }));

      expect(screen.getByText("The agent isn't running this integration.")).toBeInTheDocument();
      expect(screen.getByTestId('agentHealth')).toHaveTextContent('degraded');
    });

    it('leaves a plain unhealthy agent with just the "See agent info" line and its real status', () => {
      renderStatus(info({ health: 'unhealthy', agent: { id: 'a1', status: 'error' } as never }));

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('error');
      expect(screen.getByTestId('agentTooltip')).toHaveTextContent(/^See agent info$/);
    });
  });

  describe('an agent that is unhealthy only because of other integrations', () => {
    const elsewhere = (overrides: Partial<ServiceAgentInfo> = {}) =>
      info({
        health: 'healthy',
        agent: { id: 'a1', status: 'error' } as never,
        unhealthyElsewhere: true,
        ...overrides,
      });

    it('shows Fleet badge with the real agent status', () => {
      renderStatus(elsewhere());

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('error');
    });

    it('explains in the check-in tooltip that this integration is running', () => {
      renderStatus(elsewhere());

      expect(screen.getByTestId('agentTooltip')).toHaveTextContent(
        'The agent reports problems with other integrations. This one is running.'
      );
    });

    it('is a button, so the explanation is reachable with the keyboard', () => {
      renderStatus(elsewhere());

      expect(screen.getByTestId('serviceTile-agentStatusButton').tagName).toBe('BUTTON');
      expect(screen.queryByTestId('serviceTile-agentUnhealthyElsewhere')).not.toBeInTheDocument();
    });

    it('opens the flyout, where the failing integrations are listed', async () => {
      renderStatus(elsewhere());

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('detailsFlyout')).toBeInTheDocument();
    });

    it('can still be reached with the keyboard before the package policy is known', () => {
      renderStatus(elsewhere({ packagePolicy: undefined }));

      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
      expect(screen.getByTestId('serviceTile-agentUnhealthyElsewhere')).toHaveAttribute(
        'tabindex',
        '0'
      );
    });

    it('says nothing about other integrations for an agent that is simply healthy', () => {
      renderStatus(info());

      expect(screen.queryByTestId('serviceTile-agentUnhealthyElsewhere')).not.toBeInTheDocument();
      expect(screen.getByTestId('agentTooltip')).not.toHaveTextContent('other integrations');
    });

    it('does not apply once the integration itself is unhealthy, which has its own tooltip', async () => {
      renderStatus(
        info({
          health: 'unhealthy',
          agent: { id: 'a1', status: 'error' } as never,
          unhealthyElsewhere: true,
        })
      );

      expect(screen.getByTestId('agentTooltip')).not.toHaveTextContent('other integrations');
      expect(screen.getByTestId('serviceTile-agentStatusButton')).toBeInTheDocument();
    });
  });

  describe('a verdict made from a truncated agent list', () => {
    const incomplete = (overrides: Partial<ServiceAgentInfo> = {}) =>
      info({ health: 'pending', isIncomplete: true, ...overrides });

    it('shows Pending, not the status of the agent that was seen', () => {
      renderStatus(incomplete());

      expect(screen.queryByTestId('agentHealth')).not.toBeInTheDocument();
      expect(screen.getByTestId('serviceTile-agentPendingBadge')).toHaveTextContent('Pending');
    });

    it('opens nothing, not even the enrollment flyout of a managed integration', () => {
      renderStatus(incomplete(), 'managed_integration');

      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentTooltip')).not.toBeInTheDocument();
    });

    it('shows the status of the agent when the verdict is complete', () => {
      renderStatus(info({ health: 'healthy' }));

      expect(screen.getByTestId('agentHealth')).toHaveTextContent('online');
    });
  });

  describe('an agent that does not exist yet', () => {
    const noAgent = (overrides: Partial<ServiceAgentInfo> = {}) =>
      info({ health: 'pending', agent: undefined, agentIds: [], ...overrides });

    it('shows a Pending badge, as a button where there is an enrollment status to open', () => {
      renderStatus(noAgent());

      expect(screen.getByTestId('serviceTile-agentStatusButton')).toHaveTextContent('Pending');
      expect(screen.queryByTestId('agentHealth')).not.toBeInTheDocument();
    });

    it('shows a plain Pending badge where there is nothing to open', () => {
      renderStatus(noAgent(), 'agent_based');

      expect(screen.getByTestId('serviceTile-agentPendingBadge')).toHaveTextContent('Pending');
      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
    });

    it('opens the enrollment status for a managed integration', async () => {
      renderStatus(noAgent());

      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));

      expect(await screen.findByTestId('enrollmentFlyout')).toHaveTextContent(
        'Amazon S3|policy-1|aws@4.0.0'
      );
    });

    it('closes the enrollment flyout', async () => {
      renderStatus(noAgent());
      fireEvent.click(screen.getByTestId('serviceTile-agentStatusButton'));
      fireEvent.click(await screen.findByText('close-enrollment'));

      expect(screen.queryByTestId('enrollmentFlyout')).not.toBeInTheDocument();
    });

    it('is not clickable until the package version is known', () => {
      renderStatus(noAgent({ packagePolicy: undefined }));

      expect(screen.getByTestId('serviceTile-agentPendingBadge')).toBeInTheDocument();
      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
    });

    it('is not clickable for agent-based deployments, which have no agentless enrollment', () => {
      renderStatus(noAgent(), 'agent_based');

      expect(screen.getByTestId('serviceTile-agentPendingBadge')).toBeInTheDocument();
      expect(screen.queryByTestId('serviceTile-agentStatusButton')).not.toBeInTheDocument();
    });
  });
});
