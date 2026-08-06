/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { CUSTOM_ROLES } from '../../fixtures/custom_roles';
import { cleanupEnrichPolicy, createEnrichPolicy } from '../../lib/enrich_policies';

test.describe('Enrich policies access', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ esClient }) => {
    await cleanupEnrichPolicy(esClient);
    await createEnrichPolicy(esClient);
  });

  test.afterEach(async ({ esClient }) => {
    await cleanupEnrichPolicy(esClient);
  });

  test('read only access hides create and delete', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.monitorEnrichOnly);
    await pageObjects.indexManagement.navigateToIndexManagementTab('enrich_policies');

    await expect(page.testSubj.locator('createPolicyButton')).toBeHidden();
    await expect(page.testSubj.locator('deletePolicyButton')).toBeHidden();
  });

  test('no access hides the enrich policies tab', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.monitorOnly);
    await pageObjects.indexManagement.goto();

    await expect(page.testSubj.locator('enrich_policiesTab')).toBeHidden();
  });
});
