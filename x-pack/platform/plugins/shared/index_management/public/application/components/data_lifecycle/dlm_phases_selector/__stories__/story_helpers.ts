/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDependencies } from '../../../../app_context';

export const createStoryAppContext = (canManageSnapshotRestore: boolean): AppDependencies =>
  ({
    core: {
      getUrlForApp: (_appId: string, options?: { path?: string }) =>
        `/app/management${options?.path ?? ''}`,
      application: {
        capabilities: {
          management: {
            data: {
              snapshot_restore: canManageSnapshotRestore,
            },
            stack: {
              license_management: true,
            },
          },
        },
      },
    },
    plugins: {
      cloud: {
        isCloudEnabled: true,
        billingUrl: 'https://cloud.elastic.co/billing',
        trialDaysLeft: () => undefined,
      },
    },
  } as unknown as AppDependencies);
