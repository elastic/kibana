/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, waitFor, within } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import {
  sendGetAllFleetServerAgents,
  sendGetAgentsAvailableVersions,
  sendPostBulkAgentUpgrade,
} from '../../../../hooks';

import { AgentUpgradeAgentModal } from '.';
import type { AgentUpgradeAgentModalProps } from '.';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    sendGetAgentsAvailableVersions: jest.fn().mockResolvedValue({
      data: {
        items: ['8.10.2', '8.7.0'],
      },
    }),
    sendGetAgentStatus: jest.fn().mockResolvedValue({
      data: { results: { updating: 2 } },
    }),
    sendPostBulkAgentUpgrade: jest.fn(),
    useAgentVersion: jest.fn().mockReturnValue('8.10.2'),
    useKibanaVersion: jest.fn().mockReturnValue('8.10.2'),
    sendGetAllFleetServerAgents: jest.fn(),
  };
});

jest.mock('./hooks', () => {
  return {
    ...jest.requireActual('./hooks'),
  };
});

const mockSendPostBulkAgentUpgrade = sendPostBulkAgentUpgrade as jest.Mock;

const mockSendGetAgentsAvailableVersions = sendGetAgentsAvailableVersions as jest.Mock;
const mockSendAllFleetServerAgents = sendGetAllFleetServerAgents as jest.Mock;

function renderAgentUpgradeAgentModal(props: Partial<AgentUpgradeAgentModalProps>) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <AgentUpgradeAgentModal agents="" agentCount={12} onClose={() => {}} {...props} />
  );
  return { utils };
}

describe('AgentUpgradeAgentModal', () => {
  describe('maintenance window', () => {
    it('should set the default to Immediately if there is less than 10 agents using kuery', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: '*',
        agentCount: 3,
      });

      const container = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
      const input = within(container).getByRole<HTMLInputElement>('combobox');
      expect(input?.value).toBe('Immediately');
    });

    it('should set the default to Immediately if there is less than 10 agents using selected agents', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [{ id: 'agent1' }, { id: 'agent2' }] as any,
        agentCount: 3,
      });

      const container = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
      const input = within(container).getByRole<HTMLInputElement>('combobox');
      expect(input?.value).toBe('Immediately');
    });

    it('should set the default to 1 hour if there is more than 10 agents', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: '*',
        agentCount: 13,
      });

      const container = utils.getByTestId('agentUpgradeModal.MaintenanceCombobox');
      const input = within(container).getByRole<HTMLInputElement>('combobox');
      expect(input?.value).toBe('1 hour');
    });
  });

  describe('version combo', () => {
    it('should enable the version combo if agents is a query', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: '*',
        agentCount: 30,
      });

      await waitFor(() => {
        const el = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        expect(el.classList.contains('euiComboBox-isDisabled')).toBe(false);
      });
    });

    it('should default the version combo to latest agent version', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [{ id: 'agent1', local_metadata: { host: 'abc' } }] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('8.10.2');
      });
    });

    it('should make combo invalid on clearing version', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [{ id: 'agent1', local_metadata: { host: 'abc' } }] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        fireEvent.click(utils.getByTestId('comboBoxClearButton'));
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('');
        expect(utils.getByText('Version is required')).toBeInTheDocument();
        expect(utils.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      });
    });

    it('should make combo invalid on clearing version - bulk action', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: '*',
        agentCount: 1,
      });

      await waitFor(() => {
        fireEvent.click(utils.getByTestId('comboBoxClearButton'));
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('');
        expect(utils.getByText('Version is required')).toBeInTheDocument();
        expect(utils.getByTestId('confirmModalConfirmButton')).toBeDisabled();
      });
    });

    it('should display the custom version text input if no versions', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: { host: 'abc', elastic: { agent: { version: '8.12.0' } } },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const input = utils.getByTestId('agentUpgradeModal.VersionInput');
        expect(input?.textContent).toEqual('');
      });
    });

    it('should display invalid input if version is not a valid semver', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: { host: 'abc', elastic: { agent: { version: '8.12.0' } } },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const input = utils.getByTestId('agentUpgradeModal.VersionInput');
        fireEvent.input(input, { target: { value: '8.14' } });
        expect(
          utils.getByText('Invalid version, please use a valid semver version, e.g. 8.14.0')
        ).toBeInTheDocument();
      });
    });

    it('should not display invalid input if version is a valid semver', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: { host: 'abc', elastic: { agent: { version: '8.12.0' } } },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const input = utils.getByTestId('agentUpgradeModal.VersionInput');
        fireEvent.input(input, { target: { value: '8.14.0+build123456789' } });
        expect(
          utils.queryByText('Invalid version, please use a valid semver version, e.g. 8.14.0')
        ).toBeNull();
      });
    });

    it('should display available version options', async () => {
      mockSendGetAgentsAvailableVersions.mockClear();
      mockSendGetAgentsAvailableVersions.mockResolvedValue({
        data: {
          items: ['8.10.4', '8.10.2+build123456789', '8.10.2', '8.7.0'],
        },
      });
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: { host: 'abc', elastic: { agent: { version: '8.10.2' } } },
          },
        ] as any,
        agentCount: 1,
      });
      fireEvent.click(await utils.findByTestId('comboBoxToggleListButton'));
      const optionList = await utils.findByTestId(
        'comboBoxOptionsList agentUpgradeModal.VersionCombobox-optionsList'
      );
      expect(optionList.textContent).toEqual(['8.10.4', '8.10.2+build123456789'].join(''));
    });

    it('should disable submit button and display a warning for a single agent when version is greater than maxFleetServerVersion', async () => {
      mockSendGetAgentsAvailableVersions.mockClear();
      mockSendGetAgentsAvailableVersions.mockResolvedValue({
        data: {
          items: ['8.10.4', '8.10.2', '8.9.0', '8.8.0'],
        },
      });
      mockSendAllFleetServerAgents.mockResolvedValue({
        allFleetServerAgents: [
          { id: 'fleet-server', local_metadata: { elastic: { agent: { version: '8.9.0' } } } },
        ] as any,
      });

      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: {
              elastic: {
                agent: { version: '8.8.0', upgradeable: true },
              },
              host: { hostname: 'host00001' },
            },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('8.10.2');
        expect(
          utils.queryAllByText(
            /This action will upgrade the agent running on 'host00001' to version 8.10.2. This action can not be undone. Are you sure you wish to continue?/
          )
        );
        expect(
          utils.queryByText(
            /Cannot upgrade to version 8.10.2 because it is higher than the latest fleet server version 8.9.0./
          )
        ).toBeInTheDocument();
        const el = utils.getByTestId('confirmModalConfirmButton');
        expect(el).toBeDisabled();
      });
    });

    it('should display a warning for multiple agents when version is greater than maxFleetServerVersion and not disable submit button', async () => {
      mockSendGetAgentsAvailableVersions.mockClear();
      mockSendGetAgentsAvailableVersions.mockResolvedValue({
        data: {
          items: ['8.10.4', '8.10.2', '8.9.0', '8.8.0'],
        },
      });
      mockSendAllFleetServerAgents.mockResolvedValue({
        allFleetServerAgents: [
          { id: 'fleet-server', local_metadata: { elastic: { agent: { version: '8.9.0' } } } },
        ] as any,
      });

      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'agent1',
            local_metadata: {
              elastic: {
                agent: { version: '8.8.0', upgradeable: true },
              },
              host: { hostname: 'host00001' },
            },
          },
          {
            id: 'agent2',
            local_metadata: {
              elastic: {
                agent: { version: '8.8.1', upgradeable: true },
              },
              host: { hostname: 'host00002' },
            },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('8.10.2');
        expect(
          utils.queryAllByText(
            /This action will upgrade multiple agents to version 8.10.2. This action can not be undone. Are you sure you wish to continue?/
          )
        );
        expect(
          utils.queryByText(
            /Please choose another version. Cannot upgrade to version 8.10.2 because it is higher than the latest fleet server version 8.9.0./
          )
        ).toBeInTheDocument();
        const el = utils.getByTestId('confirmModalConfirmButton');
        expect(el).not.toBeDisabled();
      });
    });

    it('should enable submit button for a single fleet-server when version is greater than maxFleetServerVersion', async () => {
      mockSendGetAgentsAvailableVersions.mockClear();
      mockSendGetAgentsAvailableVersions.mockResolvedValue({
        data: {
          items: ['8.10.4', '8.10.2', '8.9.0', '8.8.0'],
        },
      });
      mockSendAllFleetServerAgents.mockResolvedValue({
        allFleetServerAgents: [
          { id: 'fleet-server', local_metadata: { elastic: { agent: { version: '8.9.0' } } } },
        ] as any,
      });

      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          {
            id: 'fleet-server',
            local_metadata: {
              elastic: {
                agent: { version: '8.9.0', upgradeable: true },
              },
              host: { hostname: 'host00001' },
            },
          },
        ] as any,
        agentCount: 1,
      });

      await waitFor(() => {
        const container = utils.getByTestId('agentUpgradeModal.VersionCombobox');
        const input = within(container).getByRole<HTMLInputElement>('combobox');
        expect(input?.value).toEqual('8.10.2');
        const el = utils.getByTestId('confirmModalConfirmButton');
        expect(el).toBeEnabled();
      });
    });
  });

  describe('restart upgrade', () => {
    it('should restart upgrade on updating agents if some agents in updating', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          { status: 'updating', upgrade_started_at: '2022-11-21T12:27:24Z', id: 'agent1' },
          { id: 'agent2' },
        ] as any,
        agentCount: 2,
        isUpdating: true,
      });

      const el = utils.getByTestId('confirmModalTitleText');
      expect(el.textContent).toEqual('Restart upgrade on 1 out of 2 agents stuck in updating');

      const btn = utils.getByTestId('confirmModalConfirmButton');
      await waitFor(() => {
        expect(btn).toBeEnabled();
      });

      act(() => {
        fireEvent.click(btn);
      });

      expect(mockSendPostBulkAgentUpgrade.mock.calls.at(-1)[0]).toEqual(
        expect.objectContaining({ agents: ['agent1'], force: true })
      );
    });

    it('should restart upgrade on updating agents if kuery', async () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: '*',
        agentCount: 3,
        isUpdating: true,
      });

      const el = await utils.findByTestId('confirmModalTitleText');
      expect(el.textContent).toEqual('Restart upgrade on 2 out of 3 agents stuck in updating');

      const btn = utils.getByTestId('confirmModalConfirmButton');
      await waitFor(() => {
        expect(btn).toBeEnabled();
      });

      act(() => {
        fireEvent.click(btn);
      });

      expect(mockSendPostBulkAgentUpgrade.mock.calls.at(-1)[0]).toEqual(
        expect.objectContaining({
          agents:
            '(*) AND status:updating AND upgrade_started_at:* AND NOT upgraded_at:* AND upgrade_started_at < now-2h',
          force: true,
        })
      );
    });

    it('should disable submit button if no agents stuck updating', () => {
      const { utils } = renderAgentUpgradeAgentModal({
        agents: [
          { status: 'offline', upgrade_started_at: '2022-11-21T12:27:24Z', id: 'agent1' },
          { id: 'agent2' },
        ] as any,
        agentCount: 2,
        isUpdating: true,
      });

      const el = utils.getByTestId('confirmModalConfirmButton');
      expect(el).toBeDisabled();
    });
  });

  it('should disable submit button and display a warning for a single agent that is not upgradeable', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [
        {
          status: 'offline',
          upgrade_started_at: '2022-11-21T12:27:24Z',
          id: 'agent1',
          local_metadata: { elastic: { agent: { version: '8.9.0' } } },
        },
      ] as any,
      agentCount: 2,
    });
    await waitFor(() => {
      expect(
        utils.queryByText(
          /The selected agent is not upgradeable: agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service./
        )
      ).toBeInTheDocument();
      const el = utils.getByTestId('confirmModalConfirmButton');
      expect(el).toBeDisabled();
    });
  });

  it('should enable restart upgrade if single agent stuck updating', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [
        { status: 'updating', upgrade_started_at: '2022-11-21T12:27:24Z', id: 'agent1' },
      ] as any,
      agentCount: 1,
      isUpdating: true,
    });

    const el = utils.getByTestId('confirmModalTitleText');
    expect(el.textContent).toEqual('Restart upgrade');

    const btn = utils.getByTestId('confirmModalConfirmButton');
    await waitFor(() => {
      expect(btn).toBeEnabled();
    });
  });

  it('should enable restart upgrade if single agent failed upgrade', async () => {
    const { utils } = renderAgentUpgradeAgentModal({
      agents: [
        {
          status: 'updating',
          upgrade_details: { state: 'UPG_FAILED' },
          id: 'agent1',
          active: true,
        },
      ] as any,
      agentCount: 1,
      isUpdating: true,
    });

    const el = utils.getByTestId('confirmModalTitleText');
    expect(el.textContent).toEqual('Restart upgrade');

    const btn = utils.getByTestId('confirmModalConfirmButton');
    await waitFor(() => {
      expect(btn).toBeEnabled();
    });
  });
});
