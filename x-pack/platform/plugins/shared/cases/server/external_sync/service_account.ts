/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

/**
 * Workload type Cases registers with Core's service account bindings. The workload id is the
 * connector id: the bound account applies every change of that connector's incidents.
 */
export const EXTERNAL_SYNC_WORKLOAD_TYPE = 'external_sync';

export const registerExternalSyncWorkloadType = (
  serviceAccounts: CoreSetup['security']['serviceAccounts']
): void => {
  serviceAccounts.registerWorkloadType({
    type: EXTERNAL_SYNC_WORKLOAD_TYPE,
    name: 'Case connector sync',
    description:
      'Applies changes made in an external incident (Jira, ServiceNow) to the cases pushed to it',
  });
};
