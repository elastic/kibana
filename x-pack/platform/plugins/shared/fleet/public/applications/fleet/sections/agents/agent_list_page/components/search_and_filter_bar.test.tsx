/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Agent } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';
import { ExperimentalFeaturesService } from '../../../../services';

import { SearchAndFilterBar } from './search_and_filter_bar';

jest.mock('../../../../components', () => {
  return {
    SearchBar: () => <div />,
  };
});

jest.mock('../../../../../../hooks/use_locator', () => {
  return {
    useDashboardLocator: jest.fn().mockImplementation(() => {
      return {
        id: 'DASHBOARD_APP_LOCATOR',
        getRedirectUrl: jest.fn().mockReturnValue('app/dashboards#/view/elastic_agent-a0002'),
      };
    }),
  };
});

describe('SearchAndFilterBar', () => {
  beforeAll(() => {
    // @ts-ignore - prevents us needing to mock the entire service
    ExperimentalFeaturesService.init({});
  });

  function render(props: any) {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<SearchAndFilterBar {...props} />);
  }

  it('should show no Actions button when no agent is selected', async () => {
    const selectedAgents: Agent[] = [];
    const props: any = {
      nAgentsInTable: 10,
      totalInactiveAgents: 2,
      totalManagedAgentIds: [],
      selectionMode: 'manual',
      currentQuery: '',
      selectedAgents,
      refreshAgents: () => undefined,
      agentsOnCurrentPage: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const results = render(props);
    expect(results.queryByTestId('agentBulkActionsButton')).toBeNull();
  });

  it('should show an Actions button when at least an agent is selected', async () => {
    const selectedAgents: Agent[] = [
      {
        id: 'Agent1',
        status: 'online',
        packages: ['system'],
        type: 'PERMANENT',
        active: true,
        enrolled_at: `${Date.now()}`,
        user_provided_metadata: {},
        local_metadata: {},
      },
    ];
    const props: any = {
      nAgentsInTable: 10,
      totalInactiveAgents: 2,
      totalManagedAgentIds: [],
      selectionMode: 'manual',
      currentQuery: '',
      selectedAgents,
      refreshAgents: () => undefined,
      agentsOnCurrentPage: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const results = render(props);
    expect(results.queryByTestId('agentBulkActionsButton')).not.toBeNull();
  });

  it('should show an Actions button when agents selected in query mode', async () => {
    const props: any = {
      nAgentsInTable: 10,
      totalInactiveAgents: 2,
      totalManagedAgentIds: [],
      selectionMode: 'query',
      currentQuery: '',
      selectedAgents: [],
      refreshAgents: () => undefined,
      agentsOnCurrentPage: [],
      tags: [],
      agentPolicies: [],
      selectedStatus: [],
      selectedTags: [],
      selectedAgentPolicies: [],
      showAgentActivityTour: {},
    };
    const results = render(props);
    expect(results.queryByTestId('agentBulkActionsButton')).not.toBeNull();
  });
});
