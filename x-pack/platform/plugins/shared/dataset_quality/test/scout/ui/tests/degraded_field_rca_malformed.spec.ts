/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import rison from '@kbn/rison';

import { test, testData } from '../fixtures';
import {
  LOGS_TYPE,
  buildDataStreamName,
  createComponentTemplate,
  createIndexTemplate,
  createMalformedFieldRecord,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  logsSynthMalformedMappings,
} from '../../common';

/** Fixed so the ingested documents and the query window can never drift apart. */
const TO = '2024-06-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-06-01T11:00:00.000Z',
  to: '2024-06-01T13:00:00.000Z',
  refresh: { pause: true, value: 60000 },
} as const;

/** Owned by this spec only, so it cannot interfere with the other flyout specs. */
const DATASET = 'synth.malformed.rca';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const COMPONENT_TEMPLATE = 'logs-synth-malformed-rca@mappings';
/**
 * Has to match the data stream name: for a data set that belongs to no integration
 * the flyout links to the index template the data stream resolves to, and the
 * assertion below spells that link out.
 */
const INDEX_TEMPLATE = DATA_STREAM;

/** Mapped as `long` by the fixture, while the documents send a non-numeric value. */
const MALFORMED_FIELD = 'numeric_field';

const FLYOUT = {
  cause: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
  issueDoesNotExist: 'datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist',
  mitigationTitle: 'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle',
  componentTemplateLink: 'datasetQualityManualMitigationsCustomComponentTemplateLink',
  pipelineAccordion: 'datasetQualityManualMitigationsPipelineAccordion',
  pipelineName: 'datasetQualityManualMitigationsPipelineName',
  pipelineLink: 'datasetQualityManualMitigationsPipelineLink',
  changeFieldTypeInSchema: 'datasetQualityDetailsFlyoutChangeFieldTypeInSchemaAccordion',
  createConvertProcessor: 'datasetQualityDetailsFlyoutCreateConvertProcessorAccordion',
} as const;

/**
 * Opens the details page with a quality issue already expanded from URL state.
 *
 * TODO(https://github.com/elastic/kibana/issues/287030): collapse onto
 * `pageObjects.datasetQualityDetails.goto`, which already models this state.
 */
const gotoDetails = async (
  page: ScoutPage,
  { view }: { view?: 'classic' | 'wired' } = {}
): Promise<void> => {
  const state = {
    v: 2,
    dataStream: DATA_STREAM,
    timeRange: TIME_RANGE,
    ...(view ? { view } : {}),
    expandedQualityIssue: { name: MALFORMED_FIELD, type: 'degraded' },
  };

  await page.gotoApp(testData.DATA_QUALITY_DETAILS_APP_PATH, {
    params: { [testData.DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) },
  });
  await page.testSubj.locator('datasetDetailsContainer').waitFor({ state: 'visible' });
};

test.describe(
  'Dataset quality details - malformed field root cause',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Read-only data, so it is seeded once for the whole file.
    test.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE,
        mappings: logsSynthMalformedMappings(),
      });

      await createIndexTemplate(esClient, {
        name: INDEX_TEMPLATE,
        indexPatterns: [DATA_STREAM],
        // Order matters: the built-in templates come last so they win on conflicts.
        composedOf: [COMPONENT_TEMPLATE, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
      });

      await logsSynthtraceEsClient.index(
        createMalformedFieldRecord({ to: TO, count: 5, dataset: DATASET })
      );
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE, log);
    });

    test('reports a type mismatch as the root cause', async ({ page, pageObjects }) => {
      const { datasetQualityDetails } = pageObjects;

      await gotoDetails(page);

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.cause)).toContainText(
        'Field malformed'
      );
    });

    test('offers manual mitigations for a data set of no integration', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;
      const nonIntegrationCustomName = `${LOGS_TYPE}@custom`;

      await gotoDetails(page);
      await datasetQualityDetails.waitUntilMitigationsLoaded();

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

      // A malformed field is not reported for the latest backing index, so the flyout
      // warns that the issue is no longer occurring.
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.issueDoesNotExist)).toBeVisible();

      const componentTemplateLink = datasetQualityDetails.getFlyoutSection(
        FLYOUT.componentTemplateLink
      );
      await expect(componentTemplateLink).toBeVisible();
      // Points at the index template the data stream resolves to, because no
      // integration owns this data set.
      await expect(componentTemplateLink).toHaveAttribute(
        'data-test-url',
        `/data/index_management/templates/${INDEX_TEMPLATE}`
      );

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)).toBeVisible();
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineName)).toHaveValue(
        nonIntegrationCustomName
      );
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineLink)).toHaveAttribute(
        'data-test-url',
        `/app/management/ingest/ingest_pipelines/?pipeline=${encodeURIComponent(
          nonIntegrationCustomName
        )}`
      );

      // Both accordions belong to the streams views only.
      await expect(
        datasetQualityDetails.getFlyoutSection(FLYOUT.changeFieldTypeInSchema)
      ).toBeHidden();
      await expect(
        datasetQualityDetails.getFlyoutSection(FLYOUT.createConvertProcessor)
      ).toBeHidden();
    });

    test('offers stream mitigations for wired and classic streams', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await test.step('for a wired stream', async () => {
        await gotoDetails(page, { view: 'wired' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

        // A wired stream reads its issues from the stream definition, so it neither
        // warns about a stale issue nor links to component templates or pipelines.
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.issueDoesNotExist)).toBeHidden();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.componentTemplateLink)
        ).toBeHidden();
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)).toBeHidden();

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.changeFieldTypeInSchema)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.createConvertProcessor)
        ).toBeVisible();
      });

      await test.step('for a classic stream', async () => {
        await gotoDetails(page, { view: 'classic' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.issueDoesNotExist)
        ).toBeVisible();

        // A classic stream keeps the ingest pipeline mitigation on top of the stream
        // specific ones.
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.changeFieldTypeInSchema)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.createConvertProcessor)
        ).toBeVisible();
      });
    });
  }
);
