/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';

vi.mock('../../hooks', async () => {
  return {
    ...(await vi.importActual('../../hooks')),
    useFleetServerStandalone: vi.fn(),
    useAgentEnrollmentFlyoutData: vi.fn(),
    useAgentVersion: vi.fn().mockReturnValue('8.1.0'),
    useAuthz: vi.fn().mockReturnValue({
      fleet: {
        addAgents: true,
        addFleetServers: true,
      },
      integrations: {},
    }),
    useFleetStatus: vi.fn().mockReturnValue({ isReady: true }),
  };
});

vi.mock('../../hooks/use_request', async () => {
  const module = await vi.importActual('../../hooks/use_request');
  return {
    ...module,
    useGetFleetProxies: vi.fn().mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isInitialRequest: false,
    }),
    useGetSettings: vi.fn().mockReturnValue({
      data: { item: { fleet_server_hosts: ['test'] } },
    }),
    sendGetOneAgentPolicy: vi.fn().mockResolvedValue({
      data: { item: { package_policies: [] } },
    }),
    useGetSpaceSettings: vi.fn().mockReturnValue({}),
    useGetAgentPolicies: vi.fn(),
    useGetEnrollmentSettings: vi.fn().mockReturnValue({
      isLoading: false,
      data: {
        fleet_server: {
          host: { host_urls: ['https://defaultfleetserver:8220'] },
          has_active: true,
        },
      },
    }),
  };
});

vi.mock('../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy', async () => {
  const module = await vi.importActual(
    '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy'
  );
  return {
    ...module,
    useFleetServerUnhealthy: vi.fn(),
  };
});

vi.mock(
  '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form',
  async () => {
    const module = await vi.importActual(
      '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form'
    );
    return {
      ...module,
      useAdvancedForm: vi.fn(),
    };
  }
);

vi.mock(
  '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page',
  async () => {
    const module = await vi.importActual(
      '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page'
    );
    return {
      ...module,
      FleetServerRequirementPage: vi.fn(),
    };
  }
);

vi.mock('../../applications/fleet/components/fleet_server_instructions/advanced_tab', () => {
  return {
    AdvancedTab: vi.fn(() => <div data-test-subj="advanced-tab">Advanced Tab</div>),
  };
});

/**
 * These steps functions use hooks inside useMemo which is not compatible with jest currently.
 * They are mocked per module (not via `./steps`): `compute_steps` imports them from the steps
 * index while that index's mock would still be loading its actual module.
 */
vi.mock('./steps/agent_policy_selection_step', () => ({
  AgentPolicySelectionStep: vi.fn().mockReturnValue({
    'data-test-subj': 'agent-policy-selection-step',
    title: 'agent-policy-selection-step',
    children: <>TEST</>,
  }),
}));

vi.mock('./steps/agent_enrollment_key_selection_step', () => ({
  AgentEnrollmentKeySelectionStep: vi.fn().mockReturnValue({
    'data-test-subj': 'agent-enrollment-key-selection-step',
    title: 'agent-enrollment-key-selection-step',
    children: <>TEST</>,
  }),
}));

vi.mock('./steps/configure_standalone_agent_step', () => ({
  ConfigureStandaloneAgentStep: vi.fn().mockReturnValue({
    'data-test-subj': 'configure-standalone-step',
    title: 'configure-standalone-step',
    children: <>TEST</>,
  }),
}));

vi.mock('./steps/incoming_data_confirmation_step', () => ({
  IncomingDataConfirmationStep: vi.fn().mockReturnValue({
    'data-test-subj': 'incoming-data-confirmation-step',
    title: 'incoming-data-confirmation-step',
    children: <>TEST</>,
  }),
}));

vi.mock('../../../common/services/agent_policies_helpers', () => {
  return {
    policyHasFleetServer: vi.fn().mockReturnValue(true),
  };
});
