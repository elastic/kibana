/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_AGENT_BUTTON, AGENT_FLYOUT } from '../screens/fleet';
import { cleanupAgentPolicies, deleteAgentDocs } from '../tasks/cleanup';
import { createAgentDoc } from '../tasks/agents';
import { setFleetServerHost } from '../tasks/fleet_server';
import { FLEET, navigateTo } from '../tasks/navigation';
import { request } from '../tasks/common';

import { API_VERSIONS } from '../../common/constants';
import { login } from '../tasks/login';

const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

function cleanUp() {
  deleteAgentDocs(true);
  cleanupAgentPolicies();
}
let kibanaVersion: string;
describe('Fleet add agent flyout', () => {
  describe('With a Fleet Server already setup', () => {
    beforeEach(() => {
      cleanUp();
      let policyId: string;
      // Create a Fleet server policy
      request({
        method: 'POST',
        url: '/api/fleet/agent_policies',
        headers: { 'kbn-xsrf': 'xx', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
        body: {
          id: FLEET_SERVER_POLICY_ID,
          name: 'Fleet Server policy',
          namespace: 'default',
          has_fleet_server: true,
        },
      }).then((response: any) => {
        // setup Fleet server
        policyId = response.body.item.id;
      });

      cy.getKibanaVersion().then((version) => {
        kibanaVersion = version;
      });

      cy.wrap(null).then(() => {
        cy.task('insertDocs', {
          index: '.fleet-agents',
          docs: [createAgentDoc('agent1', policyId, 'online', kibanaVersion)],
        });
        setFleetServerHost();
      });

      login();
    });

    afterEach(() => {
      cleanUp();
    });

    it('works in managed mode without agent policy created', () => {
      const AGENT_ID = 'agent' + Date.now();
      navigateTo(FLEET);

      cy.getBySel(ADD_AGENT_BUTTON).click();
      cy.intercept('POST', '/api/fleet/agent_policies?sys_monitoring=true').as('createAgentPolicy');

      cy.getBySel(AGENT_FLYOUT.CREATE_POLICY_BUTTON).click();

      let agentPolicyId: string;
      const startTime = Date.now();
      cy.wait('@createAgentPolicy', { timeout: 180000 }).then((xhr: any) => {
        cy.log('Create agent policy took: ' + (Date.now() - startTime) / 1000 + ' s');
        agentPolicyId = xhr.response.body.item.id;
      });
      // verify create button changed to dropdown
      cy.getBySel(AGENT_FLYOUT.POLICY_DROPDOWN);

      cy.wrap(null).then(() => {
        cy.task('insertDoc', {
          index: '.fleet-agents',
          id: AGENT_ID,
          doc: createAgentDoc(AGENT_ID, agentPolicyId!, 'online', kibanaVersion),
        });
      });

      cy.getBySel(AGENT_FLYOUT.CONFIRM_AGENT_ENROLLMENT_BUTTON);

      cy.wrap(null).then(() => {
        cy.task('insertDoc', {
          index: 'logs-cypress-test',
          id: 'test-' + Date.now(),
          doc: {
            '@timestamp': new Date().toISOString(),
            'agent.id': AGENT_ID,
            message: 'Test log 1',
          },
        });
      });

      cy.getBySel(AGENT_FLYOUT.INCOMING_DATA_CONFIRMED_CALL_OUT);
    });
  });
});
