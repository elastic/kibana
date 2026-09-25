/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, CUSTOM_ROLES } from '../fixtures';

test.describe(
  'ES|QL Data Federation — data source connection test',
  { tag: tags.stateful.classic },
  () => {
    test('reports an anonymous S3 data source as untestable without saving it', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { dataFederation } = pageObjects;

      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

      await test.step('open the connect data source flyout', async () => {
        await dataFederation.goto();
        await page.getByRole('tab', { name: 'Data sources' }).click();
        await dataFederation.connectDataSourceButton.click();
        await expect(dataFederation.createDataSourceFlyout).toBeVisible();
      });

      await test.step('test an anonymous S3 configuration', async () => {
        await dataFederation.createDataSourceFlyoutName.fill(
          `scout-test-connection-${randomUUID().slice(0, 8)}`
        );
        await dataFederation.createDataSourceFlyoutS3Region.fill('us-east-1');
        await dataFederation.selectDataSourceAuthentication('Anonymous');
        await dataFederation.createDataSourceFlyoutTestConnection.click();

        // Elasticsearch does not probe anonymous credentials, so this needs no network access.
        await expect(dataFederation.createDataSourceFlyoutTestConnectionUntestable).toContainText(
          'Connection could not be verified'
        );
      });

      await test.step('flyout has no accessibility violations', async () => {
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="createDataSourceFlyout"]'],
        });
        expect(violations).toStrictEqual([]);
      });

      await test.step('editing the configuration discards the result', async () => {
        await dataFederation.createDataSourceFlyoutS3Region.fill('eu-west-1');
        await expect(dataFederation.createDataSourceFlyoutTestConnectionUntestable).toBeHidden();
      });

      await test.step('closing the flyout saves nothing', async () => {
        await dataFederation.createDataSourceFlyoutCancel.click();
        await expect(dataFederation.createDataSourceFlyout).toBeHidden();
        await expect(dataFederation.dataSourcesTable).not.toContainText('scout-test-connection-');
      });
    });
  }
);
