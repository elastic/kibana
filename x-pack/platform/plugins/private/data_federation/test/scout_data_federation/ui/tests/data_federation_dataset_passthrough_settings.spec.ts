/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { getDataSetByIdApiPath, getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

interface GetDataSetResponse {
  datasets: Array<{
    description?: string;
    resource: string;
    settings?: Record<string, unknown>;
  }>;
}

test.describe(
  'ES|QL Data Federation — dataset API-only settings passthrough',
  { tag: tags.stateful.classic },
  () => {
    let dataSourceName: string | undefined;
    let dataSetName: string | undefined;

    test.afterAll(async ({ kbnClient }) => {
      if (dataSetName) {
        try {
          await kbnClient.request({ method: 'DELETE', path: getDataSetByIdApiPath(dataSetName) });
        } catch {
          // ignore cleanup errors
        }
      }

      if (dataSourceName) {
        try {
          await kbnClient.request({
            method: 'DELETE',
            path: getDataSourceByIdApiPath(dataSourceName),
          });
        } catch {
          // ignore cleanup errors
        }
      }
    });

    test('preserves partition_sample_size and file_sort_by when the description is edited', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      const createdDataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
      const createdDataSetName = `scout-dataset-passthrough-${randomUUID().slice(0, 8)}`;
      dataSourceName = createdDataSourceName;
      dataSetName = createdDataSetName;
      const resource = 's3://scout-bucket/path/**/*.parquet';
      const updatedDescription = 'Updated in the edit wizard';
      const apiOnlySettings = {
        partition_sample_size: '100',
        file_sort_by: 'mtime',
      } as const;

      await test.step('create a data source and a dataset with API-only settings (setup)', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: getDataSourceByIdApiPath(createdDataSourceName),
          body: {
            type: 's3',
            description: 'Scout passthrough settings source',
            settings: {
              access_key: 'AKIAIOSFODNN7EXAMPLE',
              secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            },
          },
        });
        await kbnClient.request({
          method: 'PUT',
          path: getDataSetByIdApiPath(createdDataSetName),
          body: {
            data_source: createdDataSourceName,
            resource,
            description: 'Initial description',
            settings: { format: 'parquet', ...apiOnlySettings },
          },
        });
      });

      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

      await test.step('open the dataset in the edit wizard', async () => {
        await pageObjects.dataFederation.goto();
        await pageObjects.dataFederation.selectTab('Datasets');
        const row = pageObjects.dataFederation.getDataSetRow(createdDataSetName);
        await expect(row).toBeVisible();
        await row.locator('[data-test-subj="dataSetsSetsEditButton"]').click();
        await pageObjects.dataFederation.createDatasetWizard.waitFor({ state: 'visible' });
      });

      await test.step('update only the description and save', async () => {
        await page.getByTestId('createDatasetDescription').fill(updatedDescription);
        await pageObjects.dataFederation.wizardNextButton.click();
        await pageObjects.dataFederation.createDatasetWizardAdditionalStep.waitFor({
          state: 'visible',
        });
        await pageObjects.dataFederation.wizardNextButton.click();
        await pageObjects.dataFederation.createDatasetWizardMappingStep.waitFor({
          state: 'visible',
        });
        await pageObjects.dataFederation.wizardNextButton.click();
        await pageObjects.dataFederation.createDatasetWizardReviewStep.waitFor({
          state: 'visible',
        });
        await pageObjects.dataFederation.wizardNextButton.click();
        await pageObjects.dataFederation.createDatasetWizard.waitFor({ state: 'hidden' });
      });

      await test.step('the description is updated and API-only settings are preserved', async () => {
        const { data } = await kbnClient.request<GetDataSetResponse>({
          method: 'GET',
          path: getDataSetByIdApiPath(createdDataSetName),
        });
        const [savedDataSet] = data.datasets;

        expect(savedDataSet.description).toBe(updatedDescription);
        expect(savedDataSet.resource).toBe(resource);
        expect(savedDataSet.settings).toMatchObject({ format: 'parquet', ...apiOnlySettings });
      });
    });
  }
);
