/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, LOCAL_SERVERLESS_UI_TAGS } from '../fixtures';

test.describe(
  'Data Usage privileges - custom role with monitor',
  { tag: LOCAL_SERVERLESS_UI_TAGS },
  () => {
    test('renders with the monitor cluster privilege', async ({ browserAuth, pageObjects }) => {
      const { dataUsage } = pageObjects;
      await browserAuth.loginWithCustomRole({
        elasticsearch: {
          cluster: ['monitor'],
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });

      await dataUsage.gotoManagement();
      await expect(dataUsage.managementCard).toBeVisible();

      await dataUsage.goto();
      await expect(dataUsage.content).toBeVisible();
    });
  }
);
