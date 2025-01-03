/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

jest.mock('../../hooks', () => {
  return {
    ...jest.requireActual('../../hooks'),
    useFleetServerStandalone: jest.fn(),
    useAgentEnrollmentFlyoutData: jest.fn(),
    useAgentVersion: jest.fn().mockReturnValue('8.1.0'),
    useAuthz: jest.fn().mockReturnValue({
      fleet: {
        addAgents: true,
        addFleetServers: true,
      },
      integrations: {},
    }),
    useFleetStatus: jest.fn().mockReturnValue({ isReady: true }),
  };
});

jest.mock('../../hooks/use_request', () => {
  const module = jest.requireActual('../../hooks/use_request');
  return {
    ...module,
    useGetFleetProxies: jest.fn().mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isInitialRequest: false,
    }),
    useGetSettings: jest.fn().mockReturnValue({
      data: { item: { fleet_server_hosts: ['test'] } },
    }),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { package_policies: [] } },
    }),
    useGetSpaceSettings: jest.fn().mockReturnValue({}),
    useGetAgentPolicies: jest.fn(),
    useGetEnrollmentSettings: jest.fn().mockReturnValue({
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

jest.mock('../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy', () => {
  const module = jest.requireActual(
    '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy'
  );
  return {
    ...module,
    useFleetServerUnhealthy: jest.fn(),
  };
});

jest.mock(
  '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form',
  () => {
    const module = jest.requireActual(
      '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form'
    );
    return {
      ...module,
      useAdvancedForm: jest.fn(),
    };
  }
);

jest.mock(
  '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page',
  () => {
    const module = jest.requireActual(
      '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page'
    );
    return {
      ...module,
      FleetServerRequirementPage: jest.fn(),
    };
  }
);

/**
 * These steps functions use hooks inside useMemo which is not compatible with jest currently
 */
jest.mock('./steps', () => {
  const module = jest.requireActual('./steps');
  return {
    ...module,
    AgentPolicySelectionStep: jest.fn().mockReturnValue({
      'data-test-subj': 'agent-policy-selection-step',
      title: 'agent-policy-selection-step',
      children: <>TEST</>,
    }),
    AgentEnrollmentKeySelectionStep: jest.fn().mockReturnValue({
      'data-test-subj': 'agent-enrollment-key-selection-step',
      title: 'agent-enrollment-key-selection-step',
      children: <>TEST</>,
    }),
    ConfigureStandaloneAgentStep: jest.fn().mockReturnValue({
      'data-test-subj': 'configure-standalone-step',
      title: 'configure-standalone-step',
      children: <>TEST</>,
    }),
    DownloadStep: jest.fn().mockReturnValue({
      'data-test-subj': 'download-step',
      title: 'download-step',
      children: <>TEST</>,
    }),
    IncomingDataConfirmationStep: jest.fn().mockReturnValue({
      'data-test-subj': 'incoming-data-confirmation-step',
      title: 'incoming-data-confirmation-step',
      children: <>TEST</>,
    }),
  };
});

jest.mock('../../../common/services/agent_policies_helpers', () => {
  return {
    policyHasFleetServer: jest.fn().mockReturnValue(true),
  };
});
