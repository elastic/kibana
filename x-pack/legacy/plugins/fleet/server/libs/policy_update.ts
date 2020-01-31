/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FleetServerLib } from './types';

export function makePolicyUpdateHandler(libs: FleetServerLib) {
  return async function policyUpdateHandler(action: string, policyId: string) {
    const internalUser = libs.framework.getInternalUser();

    if (action === 'created') {
      await libs.apiKeys.generateEnrollmentApiKey(internalUser, {
        policyId,
      });
    }

    if (action === 'updated') {
      await libs.agentsPolicy.updateAgentsForPolicyId(internalUser, policyId);
    }

    if (action === 'deleted') {
      await libs.agents.unenrollForPolicy(internalUser, policyId);
      await libs.apiKeys.deleteEnrollmentApiKeyForPolicyId(internalUser, policyId);
    }
  };
}
