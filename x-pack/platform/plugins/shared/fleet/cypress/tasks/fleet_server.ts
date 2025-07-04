/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentDoc } from './agents';
import { request } from './common';

const FLEET_SERVER_POLICY_ID = 'fleet-server-policy';

// Create a Fleet server policy
export async function setupFleetServer() {
  const policyId: string = FLEET_SERVER_POLICY_ID;
  let kibanaVersion: string;

  request({
    method: 'POST',
    url: '/api/fleet/agent_policies',
    headers: { 'kbn-xsrf': 'xx' },
    failOnStatusCode: false,
    body: {
      id: FLEET_SERVER_POLICY_ID,
      name: 'Fleet Server policy',
      namespace: 'default',
      has_fleet_server: true,
    },
  }).then((response) => {
    // 409 is expected if the policy already exists
    // this allows the test to be run repeatedly in dev
    if (response.status > 299 && response.status !== 409) {
      throw new Error(`Failed to create Fleet Server policy: ${JSON.stringify(response.body)}`);
    }
  });

  cy.getKibanaVersion().then((version) => {
    kibanaVersion = version;
  });

  // setup Fleet server
  cy.wrap(null).then(() => {
    cy.task('insertDocs', {
      index: '.fleet-agents',
      docs: [createAgentDoc('fleet-server', policyId, 'online', kibanaVersion)],
    });
    setFleetServerHost();
  });
}

export function setFleetServerHost(host = 'https://fleetserver:8220') {
  request({
    method: 'POST',
    url: '/api/fleet/fleet_server_hosts',
    body: {
      name: 'Default host',
      host_urls: [host],
      is_default: true,
    },
  });
}
