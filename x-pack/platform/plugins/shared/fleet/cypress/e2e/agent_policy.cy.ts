/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setupFleetServer } from '../tasks/fleet_server';
import { AGENT_FLYOUT, AGENT_POLICY_DETAILS_PAGE } from '../screens/fleet';
import { login } from '../tasks/login';
import { visit } from '../tasks/common';

describe('Edit agent policy', () => {
  beforeEach(() => {
    login();

    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
      },
    });
    cy.intercept('/api/fleet/agent_status?policyId=policy-1', {
      results: {
        total: 0,
        inactive: 0,
        online: 0,
        error: 0,
        offline: 0,
        updating: 0,
        other: 0,
        events: 0,
      },
    });
  });

  it('should edit agent policy', () => {
    visit('/app/fleet/policies/policy-1/settings');
    cy.get('[placeholder="Optional description"').clear().type('desc');

    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
      },
    });
    cy.intercept('PUT', '/api/fleet/agent_policies/policy-1', {
      name: 'Agent policy 1',
      description: 'desc',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    }).as('updateAgentPolicy');
    cy.get('.euiButton').contains('Save changes').click();

    cy.wait('@updateAgentPolicy').then((interception) => {
      expect(interception.request.body.description).to.equal('desc');
    });
  });

  it('should show correct fleet server host for custom URL', () => {
    setupFleetServer();

    cy.intercept('/api/fleet/agent_policies/policy-1', {
      item: {
        id: 'policy-1',
        name: 'Agent policy 1',
        description: 'desc',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        status: 'active',
        fleet_server_host_id: 'fleet-server-1',
        package_policies: [],
      },
    });

    const apiKey = {
      id: 'key-1',
      active: true,
      api_key_id: 'PefGQYoB0MXWbqVD6jhr',
      api_key: 'this-is-the-api-key',
      name: 'key-1',
      policy_id: 'policy-1',
      created_at: '2023-08-29T14:51:10.473Z',
    };

    cy.intercept('/api/fleet/enrollment_api_keys?**', {
      items: [apiKey],
      total: 1,
      page: 1,
      perPage: 10000,
    });
    cy.intercept('/api/fleet/enrollment_api_keys/key-1', {
      item: apiKey,
    });
    cy.intercept('/internal/fleet/settings/enrollment', {
      fleet_server: {
        policies: [
          {
            id: 'fleet-server-policy',
            name: 'Fleet Server policy',
            description: 'desc',
            namespace: 'default',
            monitoring_enabled: ['logs', 'metrics'],
            status: 'active',
            package_policies: [],
          },
        ],
        has_active: true,
        host: {
          id: 'fleet-default-fleet-server-host',
          name: 'Default',
          is_default: true,
          host_urls: ['https://192.168.1.23:8220'],
          is_preconfigured: true,
        },
      },
    });
    cy.intercept('/internal/fleet/settings/enrollment?agentPolicyId=policy-1', {
      fleet_server: {
        policies: [],
        has_active: true,
        host: {
          id: 'fleet-server-1',
          name: 'custom host',
          host_urls: ['https://xxx.yyy.zzz:443'],
          is_default: false,
          is_preconfigured: false,
        },
      },
    });

    visit('/app/fleet/policies/policy-1');

    cy.getBySel(AGENT_POLICY_DETAILS_PAGE.ADD_AGENT_LINK).click();
    cy.getBySel(AGENT_FLYOUT.PLATFORM_SELECTOR_EXTENDED).click();
    cy.getBySel(AGENT_FLYOUT.KUBERNETES_PLATFORM_TYPE).click();
    cy.contains('https://xxx.yyy.zzz:443');
    cy.contains('this-is-the-api-key');
  });
});
