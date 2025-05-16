/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent } from '@testing-library/react';

import { useAuthz } from '../../../../../../../../hooks/use_authz';

import { useMultipleAgentPolicies } from '../../../../../../../../hooks/use_multiple_agent_policies';

import { createIntegrationsTestRendererMock } from '../../../../../../../../mock';
import type { AgentPolicy } from '../../../../../../types';

import { PackagePolicyAgentsCell } from './package_policy_agents_cell';

jest.mock('../../../../../../../../hooks/use_multiple_agent_policies');
jest.mock('../../../../../../../../hooks/use_authz');

const useMultipleAgentPoliciesMock = useMultipleAgentPolicies as jest.MockedFunction<
  typeof useMultipleAgentPolicies
>;
const mockedUseAuthz = useAuthz as jest.MockedFunction<typeof useAuthz>;

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
    mockedUseAuthz.mockReturnValue({
      fleet: {
        addAgents: true,
        addFleetServers: true,
      },
      integrations: {
        writeIntegrationPolicies: true,
      },
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('when multiple agent policies is disabled', () => {
    beforeEach(() => {
      useMultipleAgentPoliciesMock.mockImplementation(() => {
        return { canUseMultipleAgentPolicies: false };
      });
    });

    test('it should display add agent button if count is 0', async () => {
      const utils = renderCell({
        agentPolicies: [
          {
            name: 'test Policy 1',
          } as AgentPolicy,
        ],
      });

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

      await act(async () => {
        expect(utils.queryByText('Add agent')).not.toBeInTheDocument();
        expect(utils.queryByTestId('LinkedAgentCountLink')).toBeInTheDocument();
        expect(utils.queryByText('999')).toBeInTheDocument();
      });
    });

    test('Add agent button should be disabled if canAddAgents is false', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          addAgents: false,
        },
        integrations: {
          writeIntegrationPolicies: true,
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
      useMultipleAgentPoliciesMock.mockImplementation(() => {
        return { canUseMultipleAgentPolicies: true };
      });
    });

    test('it should display agent count sum and popover if agent count > 0', async () => {
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
