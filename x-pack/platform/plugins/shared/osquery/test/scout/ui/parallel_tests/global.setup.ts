/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { OSQUERY_API_HEADERS } from '../../common/constants';

globalSetupHook(
  'Install osquery_manager Fleet package and create agent/package policies',
  async ({ kbnClient, apiServices, log }) => {
    const headers = OSQUERY_API_HEADERS;

    log.info('[osquery-setup] Installing osquery_manager Fleet package...');
    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/epm/packages/osquery_manager',
      body: { force: true },
      headers,
    });

    const packageResponse = await kbnClient.request({
      method: 'GET',
      path: '/api/fleet/epm/packages/osquery_manager',
      headers,
    });
    if (!packageResponse.data) {
      throw new Error('Fleet package GET returned empty body');
    }

    const osqueryVersion = (packageResponse.data as Record<string, Record<string, string>>).item
      .version;
    log.info(`[osquery-setup] osquery_manager v${osqueryVersion} installed`);

    const policyName = `osquery-scout-policy-${Date.now()}`;
    log.info(`[osquery-setup] Creating agent policy: ${policyName}`);
    const agentPolicyResponse = await apiServices.fleet.agent_policies.create({
      policyName,
      policyNamespace: 'default',
      params: {
        description: 'Agent policy for osquery Scout UI tests',
        monitoring_enabled: ['logs', 'metrics'],
      },
    });
    if (!agentPolicyResponse.data) {
      throw new Error('Agent policy creation returned empty body');
    }

    const agentPolicyId = agentPolicyResponse.data.item.id;

    log.info('[osquery-setup] Creating osquery_manager package policy...');
    await apiServices.fleet.package_policies.create({
      policy_ids: [agentPolicyId],
      package: { name: 'osquery_manager', version: osqueryVersion },
      name: `osquery-scout-pkg-policy-${Date.now()}`,
      namespace: 'default',
      inputs: { 'osquery_manager-osquery': { enabled: true, streams: {} } },
    });

    log.info('[osquery-setup] Global setup complete');
  }
);
