/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_RULES_READ_ROLE,
  ALERTING_V2_RULES_READ_AND_V1_READ_ROLE,
  test,
} from '../fixtures';

test.describe(
  'Rules list - heading tabs privileges',
  { tag: [...tags.stateful.classic, ...tags.serverless.search] },
  () => {
    test('shows the V1 and V2 rules tabs when the user can read both surfaces', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_AND_V1_READ_ROLE);
      await pageObjects.rulesList.goto();

      await expect(pageObjects.rulesList.v1RulesTab).toBeVisible();
      await expect(pageObjects.rulesList.v2RulesTab).toBeVisible();
    });

    test('hides the tab strip when the user cannot read the v1 Rules page', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE);
      await pageObjects.rulesList.goto();

      await expect(pageObjects.rulesList.v1RulesTab).toBeHidden();
      await expect(pageObjects.rulesList.v2RulesTab).toBeHidden();
    });
  }
);
