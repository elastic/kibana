/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { getDataSetByIdApiPath, getDataSourceByIdApiPath } from '../fixtures/api_paths';
import { test, CUSTOM_ROLES } from '../fixtures';

const S3_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE';
const S3_SECRET_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

const openComboBox = async ({
  page,
  comboBoxTestSubj,
}: {
  page: ScoutPage;
  comboBoxTestSubj: string;
}) => {
  const combo = page.getByTestId(comboBoxTestSubj);
  await combo.locator('input').click();
};

const selectComboBoxOption = async ({
  page,
  comboBoxTestSubj,
  optionText,
}: {
  page: ScoutPage;
  comboBoxTestSubj: string;
  optionText: string;
}) => {
  await openComboBox({ page, comboBoxTestSubj });
  await page.getByRole('option', { name: optionText }).click();
};

const createComboBoxCustomOption = async ({
  page,
  comboBoxTestSubj,
  value,
}: {
  page: ScoutPage;
  comboBoxTestSubj: string;
  value: string;
}) => {
  const combo = page.getByTestId(comboBoxTestSubj);
  const input = combo.locator('input');
  await input.click();
  await input.fill(value);
  await input.press('Enter');
};

const addMappingField = async ({
  page,
  type,
  name,
  path,
  format,
}: {
  page: ScoutPage;
  type:
    | 'boolean'
    | 'date'
    | 'date_nanos'
    | 'double'
    | 'integer'
    | 'ip'
    | 'keyword'
    | 'long'
    | 'unsigned_long';
  name: string;
  path: string;
  format?: string;
}) => {
  // Mapping editor keeps the add form open; it resets by key after each add.
  await page.getByTestId('dataFederationMappingEditorFieldType').selectOption(type);
  await page.getByTestId('dataFederationMappingEditorFieldName').fill(name);
  await page.getByTestId('dataFederationMappingEditorFieldPath').fill(path);
  if (format) {
    await createComboBoxCustomOption({
      page,
      comboBoxTestSubj: 'dataFederationMappingEditorFieldFormat',
      value: format,
    });
  }
  await page.getByTestId('dataFederationMappingEditorDraftAddField').click();

  // Confirm the newly added field shows up in the list.
  await expect(page.getByText(name)).toBeVisible();
};

test.describe(
  'ES|QL Data Federation — create CSV dataset wizard',
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

    test('creates a CSV dataset, validates preview, and saves', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      const createdDataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
      const createdDataSetName = `scout-dataset-csv-${randomUUID().slice(0, 8)}`;
      dataSourceName = createdDataSourceName;
      dataSetName = createdDataSetName;

      const resource = 's3://scout-bucket/path/**/*.csv';

      // Choose values that force settings into the request payload (non-default / non-empty).
      const settings = {
        delimiter: ';',
        mode: 'Quoted',
        headerRow: 'No',
        skipRows: '10',
        datetimeFormat: 'yyyy-MM-dd',
        nullValue: 'NULL',
        encoding: 'UTF-16',
        quote: "'",
        escape: '\\t',
        columnPrefix: 'c_',
        trimSpaces: 'True',
        fileExclusions: '**/*.tmp',
        partitionDetection: 'Template',
        partitionPath: '{year}/{month}',
        errorMode: 'Skip row',
        maxErrors: '10',
        maxErrorRatio: '0.1',
        schemaResolution: 'Strict',
      } as const;

      const timestamp = {
        type: 'date_nanos' as const,
        path: 'event_time',
        format: 'yyyy-MM-dd HH:mm:ss',
      };

      const mappingFields = [
        { type: 'boolean', name: 'is_active', path: 'is_active' },
        { type: 'date', name: 'created_at', path: 'created_at', format: 'yyyy-MM-dd' },
        {
          type: 'date_nanos',
          name: 'created_at_nanos',
          path: 'created_at_nanos',
          format: 'strict_date_optional_time',
        },
        { type: 'double', name: 'duration_ms', path: 'duration_ms' },
        { type: 'integer', name: 'http_status', path: 'http_status' },
        { type: 'ip', name: 'client_ip', path: 'client_ip' },
        { type: 'keyword', name: 'user_id', path: 'user_id' },
        { type: 'long', name: 'bytes', path: 'bytes' },
        { type: 'unsigned_long', name: 'bytes_unsigned', path: 'bytes_unsigned' },
      ] as const;

      await browserAuth.loginWithCustomRole(CUSTOM_ROLES.data_federation_manager);

      await test.step('ensure a data source exists (setup)', async () => {
        await kbnClient.request({
          method: 'PUT',
          path: getDataSourceByIdApiPath(createdDataSourceName),
          body: {
            type: 's3',
            description: 'Scout CSV dataset wizard source',
            settings: {
              access_key: S3_ACCESS_KEY,
              secret_key: S3_SECRET_KEY,
            },
          },
        });
      });

      await test.step('navigate to Data Federation > Datasets', async () => {
        await pageObjects.dataFederation.goto();
        await pageObjects.dataFederation.selectTab('Datasets');
        await expect(pageObjects.dataFederation.dataSetsTable).toBeVisible();
      });

      await test.step('open the create dataset wizard and complete the Dataset step', async () => {
        await pageObjects.dataFederation.createDataSetButton.click();
        await pageObjects.dataFederation.createDatasetWizard.waitFor({ state: 'visible' });

        await pageObjects.dataFederation.createDataSetDataSource.selectOptionByValue(
          createdDataSourceName
        );

        await pageObjects.dataFederation.createDataSetName.fill(createdDataSetName);
        await pageObjects.dataFederation.createDataSetResource.fill(resource);

        await page.components.superSelect('createDatasetSettingsFormat').selectOptionByValue('csv');

        await pageObjects.dataFederation.wizardNextButton.click();
        await page.getByTestId('createDatasetWizardAdditionalStep').waitFor({ state: 'visible' });
      });

      await test.step('set CSV settings (Common + Advanced) on Additional settings step', async () => {
        // Common accordion should be open by default.
        await expect(page.getByTestId('createDatasetWizardCommonSettings')).toHaveClass(
          /euiAccordion-isOpen/
        );

        await createComboBoxCustomOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsDelimiter',
          value: settings.delimiter,
        });

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsMode',
          optionText: settings.mode,
        });

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsHeaderRow',
          optionText: settings.headerRow,
        });

        await page.getByTestId('createDatasetSettingsSkipRows').fill(settings.skipRows);

        await createComboBoxCustomOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsDatetimeFormat',
          value: settings.datetimeFormat,
        });

        await page.getByTestId('createDatasetSettingsNullValue').fill(settings.nullValue);

        await createComboBoxCustomOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsEncoding',
          value: settings.encoding,
        });

        // Advanced accordion is closed by default; open it to set the rest.
        const advancedAccordion = page.getByTestId('createDatasetWizardAdvancedSettings');
        await advancedAccordion.getByRole('button', { expanded: false }).click();
        await expect(advancedAccordion).toHaveClass(/euiAccordion-isOpen/);

        await page.getByTestId('createDatasetSettingsQuote').fill(settings.quote);
        await page.getByTestId('createDatasetSettingsEscape').fill(settings.escape);
        await page.getByTestId('createDatasetSettingsColumnPrefix').fill(settings.columnPrefix);

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsTrimSpaces',
          optionText: settings.trimSpaces,
        });

        await createComboBoxCustomOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsFileExclusions',
          value: settings.fileExclusions,
        });

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsPartitionDetection',
          optionText: settings.partitionDetection,
        });

        await page.getByTestId('createDatasetSettingsPartitionPath').fill(settings.partitionPath);

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetSettingsErrorMode',
          optionText: settings.errorMode,
        });

        await page.getByTestId('createDatasetSettingsMaxErrors').fill(settings.maxErrors);
        await page.getByTestId('createDatasetSettingsMaxErrorRatio').fill(settings.maxErrorRatio);
      });

      await test.step('Mapping: set schema resolution, configure @timestamp, and add declared mappings', async () => {
        await pageObjects.dataFederation.wizardNextButton.click();
        await page.getByTestId('createDatasetWizardMappingStep').waitFor({ state: 'visible' });

        // Select infer schema first so schema resolution is enabled, then switch to Define schema
        // before adding mappings (to validate the declared schema path end-to-end).
        await page.getByTestId('createDatasetWizardInferSchemaCard').click();

        await page.getByTestId('createDatasetWizardSchemaResolutionToggle').click();

        await selectComboBoxOption({
          page,
          comboBoxTestSubj: 'createDatasetWizardSchemaResolution',
          optionText: settings.schemaResolution,
        });

        await page.getByTestId('createDatasetWizardDefineSchemaCard').click();

        // Timeseries data (@timestamp) is enabled by default.
        await expect(page.getByTestId('createDatasetWizardTimeseriesToggle')).toHaveAttribute(
          'aria-checked',
          'true'
        );
        await page.getByTestId('createDatasetWizardTimestampType').selectOption(timestamp.type);
        await page.getByTestId('createDatasetWizardTimestampPath').fill(timestamp.path);
        await createComboBoxCustomOption({
          page,
          comboBoxTestSubj: 'createDatasetWizardTimestampFormat',
          value: timestamp.format,
        });

        // Declared field mappings: one for each supported field type.
        await page.getByTestId('dataFederationMappingEditorAddField').click();
        for (const f of mappingFields) {
          await addMappingField({ page, ...f });
        }
      });

      await test.step('Review (preview): validate settings summary and save', async () => {
        await pageObjects.dataFederation.wizardNextButton.click();
        await page.getByTestId('createDatasetWizardReviewStep').waitFor({ state: 'visible' });

        // Dataset fields
        await expect(page.getByTestId('createDatasetWizardReview-name')).toContainText(
          createdDataSetName
        );
        await expect(page.getByTestId('createDatasetWizardReview-resource')).toContainText(
          resource
        );

        // Settings (preview)
        await expect(page.getByTestId('createDatasetWizardReview-format')).toContainText('CSV');
        await expect(page.getByTestId('createDatasetWizardReview-delimiter')).toContainText(
          settings.delimiter
        );
        await expect(page.getByTestId('createDatasetWizardReview-mode')).toContainText(
          settings.mode
        );
        await expect(page.getByTestId('createDatasetWizardReview-header_row')).toContainText(
          settings.headerRow
        );
        await expect(page.getByTestId('createDatasetWizardReview-skip_rows')).toContainText(
          settings.skipRows
        );
        await expect(page.getByTestId('createDatasetWizardReview-datetime_format')).toContainText(
          settings.datetimeFormat
        );
        await expect(page.getByTestId('createDatasetWizardReview-null_value')).toContainText(
          settings.nullValue
        );
        await expect(page.getByTestId('createDatasetWizardReview-encoding')).toContainText(
          settings.encoding
        );
        await expect(page.getByTestId('createDatasetWizardReview-quote')).toContainText(
          settings.quote
        );
        await expect(page.getByTestId('createDatasetWizardReview-escape')).toContainText(
          settings.escape
        );
        await expect(page.getByTestId('createDatasetWizardReview-column_prefix')).toContainText(
          settings.columnPrefix
        );
        await expect(page.getByTestId('createDatasetWizardReview-trim_spaces')).toContainText(
          'Enabled'
        );
        await expect(page.getByTestId('createDatasetWizardReview-file_exclusions')).toContainText(
          settings.fileExclusions
        );
        await expect(
          page.getByTestId('createDatasetWizardReview-partition_detection')
        ).toContainText(settings.partitionDetection);
        await expect(page.getByTestId('createDatasetWizardReview-partition_path')).toContainText(
          settings.partitionPath
        );
        await expect(page.getByTestId('createDatasetWizardReview-error_mode')).toContainText(
          settings.errorMode
        );
        await expect(page.getByTestId('createDatasetWizardReview-max_errors')).toContainText(
          settings.maxErrors
        );
        await expect(page.getByTestId('createDatasetWizardReview-max_error_ratio')).toContainText(
          settings.maxErrorRatio
        );
        await expect(page.getByTestId('createDatasetWizardReview-schema_resolution')).toContainText(
          settings.schemaResolution
        );

        // Mapping summary
        await expect(
          page.getByTestId('createDatasetWizardReview-schema_mapping_mode')
        ).toContainText('Declared in wizard');
        await expect(page.getByTestId('createDatasetWizardReview-dynamic_fields')).toContainText(
          'Off'
        );
        await expect(page.getByTestId('createDatasetWizardReview-mapped_fields')).toContainText(
          String(mappingFields.length + 1) // +1 for @timestamp
        );
        await expect(page.getByTestId('createDatasetWizardReview-timestamp_mapping')).toContainText(
          'On'
        );
        await expect(page.getByTestId('createDatasetWizardReview-timestamp_path')).toContainText(
          timestamp.path
        );
        await expect(page.getByTestId('createDatasetWizardReview-timestamp_format')).toContainText(
          timestamp.format
        );

        // Save and ensure we land back on the datasets table.
        await pageObjects.dataFederation.wizardNextButton.click();
        await pageObjects.dataFederation.createDatasetWizard.waitFor({ state: 'hidden' });

        const row = pageObjects.dataFederation.getDataSetRow(createdDataSetName);
        await expect(row).toBeVisible();
        await expect(row).toContainText(resource);
      });
    });
  }
);
