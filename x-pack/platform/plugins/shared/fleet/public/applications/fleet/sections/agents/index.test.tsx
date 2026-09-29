/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import React from 'react';

import { createFleetTestRendererMock } from '../../../../mock';
import { useFleetStatus } from '../../../../hooks/use_fleet_status';
import { useAuthz } from '../../../../hooks/use_authz';

import { useGetSpaceSettings } from '../../hooks';

import { AgentsApp } from '.';

vi.mock('../../../../hooks/use_fleet_status', async () => {
      const mocked = {
      ...(await vi.importActual('../../../../hooks/use_fleet_status')),
      useFleetStatus: vi.fn().mockReturnValue({}),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../../../hooks/use_request/settings');
vi.mock('../../../../hooks/use_authz');
vi.mock('./agent_requirements_page', () => {
  return {
    FleetServerRequirementPage: () => <>FleetServerRequirementPage</>,
    MissingESRequirementsPage: () => <>MissingESRequirementsPage</>,
  };
});
vi.mock('./agent_list_page', () => {
  return {
    AgentListPage: () => <>AgentListPage</>,
  };
});

const mockedUsedFleetStatus = useFleetStatus as MockedFunction<typeof useFleetStatus>;
const mockedUseAuthz = useAuthz as MockedFunction<typeof useAuthz>;

function renderAgentsApp() {
  const renderer = createFleetTestRendererMock();
  renderer.mountHistory.push('/agents');

  const utils = renderer.render(<AgentsApp />);

  return { utils };
}
describe('AgentApp', () => {
  beforeEach(() => {
    mockedUseAuthz.mockReturnValue({
      fleet: {
        readAgents: true,
        allAgents: true,
      },
      integrations: {},
    } as any);
    vi.mocked(useGetSpaceSettings).mockReturnValue({} as any);
  });

  it('should render the loading component if the status is loading', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: true,
      enabled: true,
      isReady: false,
      refetch: async () => {},
      forceDisplayInstructions: false,
      setForceDisplayInstructions: () => {},
    });
    const { utils } = renderAgentsApp();

    expect(utils.container.querySelector('[data-test-subj=loadingSpinner]')).not.toBeNull();
  });

  it('should render the missing requirement component if the status contains missing requirement', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: ['api_keys'],
      refetch: async () => {},
      forceDisplayInstructions: false,
      setForceDisplayInstructions: () => {},
    });
    const { utils } = renderAgentsApp();
    expect(utils.queryByText('MissingESRequirementsPage')).not.toBeNull();
    expect(utils.queryByText('AgentListPage')).toBeNull();
  });

  it('should render the FleetServerRequirementPage if the status contains only fleet server missing requirement', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: ['fleet_server'],
      refetch: async () => {},
      forceDisplayInstructions: false,
      setForceDisplayInstructions: () => {},
    });
    const { utils } = renderAgentsApp();
    expect(utils.queryByText('FleetServerRequirementPage')).not.toBeNull();
    expect(utils.queryByText('AgentListPage')).toBeNull();
  });

  it('should render the App if there is no missing requirements and optionnal requirements', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: [],
      missingOptionalFeatures: ['encrypted_saved_object_encryption_key_required'],
      refetch: async () => {},
      forceDisplayInstructions: false,
      setForceDisplayInstructions: () => {},
    });
    const { utils } = renderAgentsApp();

    expect(utils.queryByText('AgentListPage')).not.toBeNull();
  });
});
