/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

const REMOVED_FIELD = 'order_id';
const KEPT_FIELD = 'customer_id';

test.describe('ES|QL Data Federation — mapping fields', { tag: tags.stateful.classic }, () => {
  let dataSourceName: string | undefined;

  test.afterAll(async ({ kbnClient }) => {
    if (!dataSourceName) return;

    try {
      await kbnClient.request({
        method: 'DELETE',
        path: getDataSourceByIdApiPath(dataSourceName),
      });
    } catch {
      // ignore cleanup errors
    }
  });

  test('preserves mapping fields across preview navigation and deletes only the chosen field', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    const createdDataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const createdDataSetName = `scout-dataset-${randomUUID().slice(0, 8)}`;
    dataSourceName = createdDataSourceName;
    const { dataFederation } = pageObjects;

    await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

    await test.step('ensure a data source exists (setup)', async () => {
      await kbnClient.request({
        method: 'PUT',
        path: getDataSourceByIdApiPath(createdDataSourceName),
        body: {
          type: 's3',
          description: 'Scout mapping field navigation source',
          settings: {
            access_key: 'AKIAIOSFODNN7EXAMPLE',
            secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
      });
    });

    await test.step('open the create dataset wizard on the mapping step', async () => {
      await dataFederation.goto();
      await dataFederation.selectTab('Datasets');

      await dataFederation.openCreateDatasetWizardAtMapping({
        dataSourceName: createdDataSourceName,
        name: createdDataSetName,
        resource: 's3://scout-bucket/path/**/*.parquet',
        format: 'parquet',
      });
    });

    await test.step('add a field mapping and open the preview', async () => {
      await dataFederation.addMappingField(REMOVED_FIELD);
      await expect(dataFederation.mappingFieldRows).toHaveCount(1);

      await dataFederation.goToDatasetReviewStep();
      await expect(page.getByTestId('createDatasetWizardReview-mapped_fields')).toHaveText('2');
    });

    await test.step('return to mapping and add another field', async () => {
      await dataFederation.goBackToDatasetMappingStep();
      await expect(dataFederation.getMappingFieldRow(REMOVED_FIELD)).toBeVisible();
      await expect(dataFederation.mappingFieldRows).toHaveCount(1);

      await dataFederation.addMappingField(KEPT_FIELD);
      await expect(dataFederation.getMappingFieldRow(REMOVED_FIELD)).toBeVisible();
      await expect(dataFederation.getMappingFieldRow(KEPT_FIELD)).toBeVisible();
      await expect(dataFederation.mappingFieldRows).toHaveCount(2);
    });

    await test.step('open the preview again and return to mapping', async () => {
      await dataFederation.goToDatasetReviewStep();
      await expect(page.getByTestId('createDatasetWizardReview-mapped_fields')).toHaveText('3');

      await dataFederation.goBackToDatasetMappingStep();
      await expect(dataFederation.getMappingFieldRow(REMOVED_FIELD)).toBeVisible();
      await expect(dataFederation.getMappingFieldRow(KEPT_FIELD)).toBeVisible();
      await expect(dataFederation.mappingFieldRows).toHaveCount(2);
    });

    await test.step('delete one field and leave the other in place', async () => {
      await dataFederation.removeMappingField(REMOVED_FIELD);

      await expect(dataFederation.getMappingFieldRow(REMOVED_FIELD)).toHaveCount(0);
      await expect(dataFederation.getMappingFieldRow(KEPT_FIELD)).toBeVisible();
      await expect(dataFederation.mappingFieldRows).toHaveCount(1);
      await expect(page.getByTestId('createDatasetWizardTimestampPath')).toHaveValue('timestamp');
    });
  });
});
