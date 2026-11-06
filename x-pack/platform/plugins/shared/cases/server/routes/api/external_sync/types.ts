/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { CoreServiceAccountsService, KibanaRequest, PubSubStart } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';

export interface ExternalSyncRouteDeps {
  getStartServices: () => Promise<{
    pubsub: PubSubStart;
    serviceAccounts: CoreServiceAccountsService;
  }>;
  getActionsClient: (request: KibanaRequest) => Promise<PublicMethodsOf<ActionsClient>>;
  getSpaceId: (request: KibanaRequest) => string;
}
