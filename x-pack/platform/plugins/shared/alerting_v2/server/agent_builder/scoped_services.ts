/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { Global } from '@kbn/core-di-internal';
import { RulesClient } from '../lib/rules_client';
import { NotificationPolicyClient } from '../lib/notification_policy_client';

export interface ScopedAlertingServices {
  rulesClient: RulesClient;
  notificationPolicyClient: NotificationPolicyClient;
}

export type ScopedServicesFactory = (request: KibanaRequest) => Promise<ScopedAlertingServices>;

/**
 * Creates a factory function that, given a KibanaRequest, forks the Inversify
 * DI container, binds the request for request-scoped resolution, and returns
 * scoped instances of RulesClient and NotificationPolicyClient.
 */
export const createScopedServicesFactory = (
  getStartServices: CoreSetup['getStartServices']
): ScopedServicesFactory => {
  return async (request: KibanaRequest) => {
    const [coreStart] = await getStartServices();
    const scope = coreStart.injection.fork();

    scope.bind(Request).toConstantValue(request);
    scope.bind(Global).toConstantValue(Request);

    try {
      return {
        rulesClient: scope.get(RulesClient),
        notificationPolicyClient: scope.get(NotificationPolicyClient),
      };
    } finally {
      await scope.unbindAll();
    }
  };
};
