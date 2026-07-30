/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

// All Upgrade Assistant UI tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
test.describe.skip(
  'Upgrade Assistant deprecation pages',
  { tag: testData.UPGRADE_ASSISTANT_TAGS },
  () => {
    test.beforeAll(async ({ esClient }) => {
      await esClient.transport.request({
        method: 'PUT',
        path: `/_component_template/${testData.DEPRECATED_TEMPLATE_NAME}`,
        body: {
          template: {
            mappings: {
              _source: {
                mode: 'stored',
              },
            },
          },
        },
      });
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.cluster.deleteComponentTemplate({
        name: testData.DEPRECATED_TEMPLATE_NAME,
      });
    });

    test('renders Elasticsearch upgrade readiness deprecations', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginAsSuperuser();
      await pageObjects.upgradeAssistant.gotoOverview();

      await pageObjects.upgradeAssistant.clickEsDeprecationsPanel();
      await expect(pageObjects.upgradeAssistant.esDeprecationsTable).toBeVisible();

      const deprecationMessages = await pageObjects.upgradeAssistant.getEsDeprecationMessages();
      expect(deprecationMessages).toContainEqual(
        expect.stringContaining(testData.DEPRECATED_SOURCE_MODE_MESSAGE)
      );
    });

    test('renders the Kibana deprecations page', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsSuperuser();
      await pageObjects.upgradeAssistant.gotoOverview();

      await pageObjects.upgradeAssistant.clickKibanaDeprecationsPanel();
      await expect(pageObjects.upgradeAssistant.kibanaDeprecations).toBeVisible();
    });
  }
);
