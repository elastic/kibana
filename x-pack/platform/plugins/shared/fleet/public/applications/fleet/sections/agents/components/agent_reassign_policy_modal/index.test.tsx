/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import { sendPostAgentReassign, useGetAgentPolicies, useStartServices } from '../../../../hooks';

import { AgentReassignAgentPolicyModal } from '.';

const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendPostAgentReassign: jest.fn(),
  sendPostBulkAgentReassign: jest.fn(),
  useGetAgentPolicies: jest.fn(),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addSuccess: jest.fn(),
        addError: jest.fn(),
      },
    },
  }),
}));

jest.mock('../../../../components', () => ({
  AgentPolicyPackageBadges: () => null,
}));

const mockSendPostAgentReassign = sendPostAgentReassign as jest.Mock;
const mockUseGetAgentPolicies = useGetAgentPolicies as jest.Mock;
const mockUseStartServices = useStartServices as jest.Mock;

const POLICY_A = { id: 'policy-a', name: 'Policy A', is_managed: false };
const POLICY_B = { id: 'policy-b', name: 'Policy B', is_managed: false };

function mockPolicies(policies = [POLICY_A, POLICY_B]) {
  mockUseGetAgentPolicies.mockReturnValue({
    isLoading: false,
    data: { items: policies },
  });
}

function render(props: { agents: any; agentCount?: number; onClose?: () => void }) {
  const renderer = createFleetTestRendererMock();
  const onClose = props.onClose ?? jest.fn();
  const utils = renderer.render(
    <AgentReassignAgentPolicyModal
      onClose={onClose}
      agents={props.agents}
      agentCount={props.agentCount ?? 1}
    />
  );
  return { utils, onClose };
}

describe('AgentReassignAgentPolicyModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPolicies();
    mockUseStartServices.mockReturnValue({
      notifications: {
        toasts: {
          addSuccess: mockAddSuccess,
          addError: mockAddError,
        },
      },
    });
  });

  describe('single agent', () => {
    const singleAgent = [{ id: 'agent-1', policy_id: 'policy-a' } as any];

    it('confirm button is disabled when the same policy is already selected', () => {
      const { utils } = render({ agents: singleAgent });

      expect(utils.getByTestId('confirmModalConfirmButton')).toBeDisabled();
    });

    describe('versioned policy_id (e.g. policy-a#9.4)', () => {
      const versionedAgent = [{ id: 'agent-1', policy_id: 'policy-a#9.4' } as any];

      it('pre-selects the base policy in the dropdown', () => {
        const { utils } = render({ agents: versionedAgent });

        // The combobox pill should show the base policy name, not an empty string
        expect(utils.getByRole('combobox')).toBeInTheDocument();
        expect(utils.getByText('Policy A')).toBeInTheDocument();
      });

      it('confirm button is disabled when the base policy is already selected', () => {
        const { utils } = render({ agents: versionedAgent });

        expect(utils.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      });

      it('confirm button is enabled after selecting a different policy', async () => {
        const { utils } = render({ agents: versionedAgent });

        const combobox = utils.getByRole('combobox');
        act(() => {
          fireEvent.change(combobox, { target: { value: 'Policy B' } });
        });
        const optionB = await utils.findByText('Policy B');
        act(() => {
          fireEvent.click(optionB);
        });

        expect(utils.getByTestId('confirmModalConfirmButton')).not.toBeDisabled();
      });

      it('calls sendPostAgentReassign with the selected base policy id', async () => {
        mockSendPostAgentReassign.mockResolvedValue({});
        const { utils } = render({ agents: versionedAgent });

        const combobox = utils.getByRole('combobox');
        act(() => {
          fireEvent.change(combobox, { target: { value: 'Policy B' } });
        });
        const optionB = await utils.findByText('Policy B');
        act(() => {
          fireEvent.click(optionB);
        });

        act(() => {
          fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));
        });

        await waitFor(() => {
          expect(mockSendPostAgentReassign).toHaveBeenCalledWith('agent-1', {
            policy_id: 'policy-b',
          });
        });
      });
    });
  });
});
