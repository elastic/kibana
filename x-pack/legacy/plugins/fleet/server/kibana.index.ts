/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose } from './libs/compose/kibana';
import { initRestApi } from './routes/init_api';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { PolicyUpdatedEvent } from '../common/types/domain_data';

export const initServerWithKibana = (hapiServer: any) => {
  const libs = compose(hapiServer);
  initRestApi(hapiServer, libs);
  // expose methods
  libs.framework.expose('policyUpdated', async function handlePolicyUpdate(
    event: PolicyUpdatedEvent,
    user: FrameworkUser = {
      kind: 'internal',
    }
  ) {
    if (event.type === 'created') {
      await libs.apiKeys.generateEnrollmentApiKey(user, {
        policyId: event.policyId,
      });
    }
    if (event.type === 'deleted') {
      await libs.agents.unenrollForPolicy(user, event.policyId);
      await libs.apiKeys.deleteEnrollmentApiKeyForPolicyId(user, event.policyId);
    }
  });
};
