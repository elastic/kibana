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
    settings?: Record<string, unknown>;
  }>;
}

test.describe(
  'ES|QL Data Federation — dataset settings not defined in the Kibana schema',
  { tag: tags.deploymentAgnostic },
  () => {
    const dataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const dataSetName = `scout-dataset-multiline-${randomUUID().slice(0, 8)}`;

    test.afterAll(async ({ kbnClient }) => {
      for (const path of [
        getDataSetByIdApiPath(dataSetName),
        getDataSourceByIdApiPath(dataSourceName),
      ]) {
        try {
          await kbnClient.request({ method: 'DELETE', path });
        } catch {
          // ignore cleanup errors
        }
      }
    });

    test('preserves multiline_fields when the description is edited', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      const updatedDescription = 'Updated in the edit wizard';

      await test.step('create a data source and a CSV dataset with multiline_fields (setup)', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: getDataSourceByIdApiPath(dataSourceName),
          body: {
            type: 's3',
            description: 'Scout unknown settings source',
            settings: {
              access_key: 'AKIAIOSFODNN7EXAMPLE',
              secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            },
          },
        });
        await kbnClient.request({
          method: 'PUT',
          path: getDataSetByIdApiPath(dataSetName),
          body: {
            data_source: dataSourceName,
            resource: 's3://scout-bucket/path/**/*.csv',
            description: 'Initial description',
            settings: { format: 'csv', multiline_fields: true },
          },
        });
      });

      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

      await test.step('open the dataset in the edit wizard', async () => {
        await pageObjects.dataFederation.goto();
        await pageObjects.dataFederation.selectTab('Datasets');
        await expect(pageObjects.dataFederation.getDataSetRow(dataSetName)).toBeVisible();
        await pageObjects.dataFederation.openEditDataSetWizard(dataSetName);
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

      await test.step('the description is updated and multiline_fields is preserved', async () => {
        const { data } = await kbnClient.request<GetDataSetResponse>({
          method: 'GET',
          path: getDataSetByIdApiPath(dataSetName),
        });
        const [savedDataSet] = data.datasets;

        expect(savedDataSet.description).toBe(updatedDescription);
        expect(savedDataSet.settings).toMatchObject({ format: 'csv', multiline_fields: true });
      });
    });
  }
);
