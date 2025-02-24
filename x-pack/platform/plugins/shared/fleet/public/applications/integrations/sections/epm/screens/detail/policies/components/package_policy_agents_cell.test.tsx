/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../../mock';
import type { AgentPolicy } from '../../../../../../types';
import { useAuthz, useMultipleAgentPolicies } from '../../../../../../hooks';

import { PackagePolicyAgentsCell } from './package_policy_agents_cell';

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  useAuthz: jest.fn(),
  useMultipleAgentPolicies: jest.fn(),
  useConfirmForceInstall: jest.fn(),
}));

const useMultipleAgentPoliciesMock = useMultipleAgentPolicies as jest.MockedFunction<
  typeof useMultipleAgentPolicies
>;
function renderCell({
  agentPolicies = [] as AgentPolicy[],
  onAddAgent = () => {},
  hasHelpPopover = false,
}) {
  const renderer = createIntegrationsTestRendererMock();

  return renderer.render(
    <PackagePolicyAgentsCell
      agentPolicies={agentPolicies}
      onAddAgent={onAddAgent}
      hasHelpPopover={hasHelpPopover}
    />
  );
}

describe('PackagePolicyAgentsCell', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        addAgents: true,
        addFleetServers: true,
      },
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when multiple agent policies is disabled', () => {
    beforeEach(() => {
      useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: false });
    });

    test('it should display add agent button if count is 0', async () => {
      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
          } as AgentPolicy,
        ],
      });
      utils.debug();
      await act(async () => {
        expect(utils.queryByText('Add agent')).toBeInTheDocument();
      });
    });

    test('it should display only count if count > 0', async () => {
      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
            agents: 999,
          } as AgentPolicy,
        ],
      });
      await act(async () => {
        expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
        expect(utils.queryByText('999')).toBeInTheDocument();
      });
    });

    test('it should not display help popover if count is > 0 and hasHelpPopover=true', async () => {
      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
            agents: 999,
          } as AgentPolicy,
        ],
        hasHelpPopover: true,
      });
      await act(async () => {
        expect(utils.queryByText('999')).toBeInTheDocument();
        expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
        expect(
          utils.container.querySelector('[data-test-subj="addAgentHelpPopover"]')
        ).not.toBeInTheDocument();
      });
    });

    test('it should display help popover if count = 0 and hasHelpPopover=true', async () => {
      const utils = renderCell({
        hasHelpPopover: true,
        agentPolicies: [
          {
            name: 'test Policy 1',
          } as AgentPolicy,
        ],
      });
      await act(async () => {
        expect(utils.queryByText('9999')).not.toBeInTheDocument();
        expect(utils.queryByText('Add agent')).toBeInTheDocument();
        expect(
          utils.container.querySelector('[data-test-subj="addAgentHelpPopover"]')
        ).toBeInTheDocument();
      });
    });

    test('it should not display add agent button if policy is managed', async () => {
      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
            agents: 999,
            is_managed: true,
          } as AgentPolicy,
        ],
      });
      utils.debug();
      await act(async () => {
        expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
        expect(utils.queryByTestId('LinkedAgentCountLink')).toBeInTheDocument();
        expect(utils.queryByText('999')).toBeInTheDocument();
      });
    });

    test('Add agent button should be disabled if canAddAgents is false', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: false,
        },
      } as any);

      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
          } as AgentPolicy,
        ],
      });
      await act(async () => {
        expect(utils.container.querySelector('[data-test-subj="addAgentButton"]')).toBeDisabled();
      });
    });
  });

  describe('when multiple agent policies is enabled', () => {
    beforeEach(() => {
      useMultipleAgentPoliciesMock.mockReturnValue({ canUseMultipleAgentPolicies: true });
    });

    test('it should display agent count sum and popover if agent count > 0', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: false,
        },
      } as any);

      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
            agents: 100,
          } as AgentPolicy,
          {
            name: 'test Policy 2',
            agents: 200,
          } as AgentPolicy,
        ],
      });
      await act(async () => {
        expect(utils.queryByText('300')).toBeInTheDocument();
        expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
        const button = utils.getByTestId('agentsCountsButton');
        fireEvent.click(button);
        expect(utils.queryByTestId('agentCountsPopover')).toBeInTheDocument();
      });
    });
  });
});
