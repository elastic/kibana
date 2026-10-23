/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, LOCAL_SERVERLESS_UI_TAGS } from '../fixtures';

test.describe(
  'Data Usage privileges - custom role without monitor',
  { tag: LOCAL_SERVERLESS_UI_TAGS },
  () => {
    test('does not render without the monitor cluster privilege', async ({
      browserAuth,
      pageObjects,
    }) => {
      const { dataUsage } = pageObjects;
      await browserAuth.loginWithCustomRole({
        elasticsearch: {
          cluster: [],
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });

      await dataUsage.gotoManagement();
      await expect(dataUsage.managementCard).toBeHidden();

      await dataUsage.goto();
      await expect(dataUsage.managementCards).toBeVisible();
      await expect(dataUsage.content).toBeHidden();
    });
  }
);
