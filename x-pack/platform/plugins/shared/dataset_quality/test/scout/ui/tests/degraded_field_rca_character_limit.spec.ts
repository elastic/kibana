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
import { generateShortId, log as logDoc, timerange } from '@kbn/synthtrace-client';

import { test, testData } from '../fixtures';
import {
  ANOTHER_1024_CHARS,
  DEFAULT_NAMESPACE,
  LOGS_TYPE,
  MORE_THAN_1024_CHARS,
  buildDataStreamName,
  createComponentTemplate,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  getWriteBackingIndexName,
  logsSynthMappings,
  rolloverDataStream,
  setDataStreamSettings,
} from '../../common';

/** Fixed so the ingested documents and the query window can never drift apart. */
const INGEST_FROM = '2024-06-01T11:55:00.000Z';
const INGEST_TO = '2024-06-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-06-01T11:00:00.000Z',
  to: '2024-06-01T13:00:00.000Z',
  refresh: { pause: true, value: 60000 },
} as const;

/** Owned by this spec only, so it cannot interfere with the other flyout specs. */
const DATASET = 'synth.degraded.charlimit';
const DATA_STREAM = buildDataStreamName({ dataset: DATASET });
const COMPONENT_TEMPLATE = 'logs-synth-charlimit@mappings';
/**
 * The index template name has to match the data stream name: for a data stream that
 * belongs to no integration the flyout links to the index template it resolves to,
 * and the assertion below spells that link out.
 */
const INDEX_TEMPLATE = DATA_STREAM;

const SERVICE_NAME = 'test_service';
const CHARACTER_LIMIT_FIELD = 'test_field';

/**
 * `logsSynthMappings()` maps 25 fields (leaves, parent objects and multi-fields all
 * count), so the limits are picked relative to that: 25 leaves no room, rejecting the
 * second ingest's whole `cloud` object; 26 (set on the rollover's index) fits `cloud`,
 * so the third ingest is reported a level deeper as `cloud.project`.
 */
const SYNTH_MAPPED_FIELD_COUNT = 25;
const FIELD_LIMIT_FIRST_INDEX = SYNTH_MAPPED_FIELD_COUNT;
const FIELD_LIMIT_LATEST_INDEX = SYNTH_MAPPED_FIELD_COUNT + 1;

const FLYOUT = {
  cause: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
  characterLimit: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-characterLimit',
  values: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-values',
  docCount: 'datasetQualityDetailsDegradedFieldFlyoutFieldsList-docCount',
  mitigationTitle: 'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle',
  componentTemplateLink: 'datasetQualityManualMitigationsCustomComponentTemplateLink',
  pipelineAccordion: 'datasetQualityManualMitigationsPipelineAccordion',
  pipelineName: 'datasetQualityManualMitigationsPipelineName',
  pipelineLink: 'datasetQualityManualMitigationsPipelineLink',
  modifyFieldValue: 'datasetQualityDetailsFlyoutModifyFieldValueAccordion',
  increaseCharacterLimit: 'datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordion',
} as const;

/**
 * Opens the details page with a quality issue expanded and/or the current quality
 * issues toggle preset from URL state.
 *
 * TODO(https://github.com/elastic/kibana/issues/287030): collapse onto
 * `pageObjects.datasetQualityDetails.goto`, which already models this state.
 */
const gotoDetails = async (
  page: ScoutPage,
  {
    field,
    view,
    showCurrentQualityIssues,
  }: {
    field?: string;
    view?: 'classic' | 'wired';
    showCurrentQualityIssues?: boolean;
  } = {}
): Promise<void> => {
  const state = {
    v: 2,
    dataStream: DATA_STREAM,
    timeRange: TIME_RANGE,
    ...(view ? { view } : {}),
    ...(field ? { expandedQualityIssue: { name: field, type: 'degraded' } } : {}),
    ...(showCurrentQualityIssues === undefined ? {} : { showCurrentQualityIssues }),
  };

  await page.gotoApp(testData.DATA_QUALITY_DETAILS_APP_PATH, {
    params: { [testData.DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) },
  });
  await page.testSubj.locator('datasetDetailsContainer').waitFor({ state: 'visible' });
};

/** Every degraded document carries an over-long `log.level` and `test_field`. */
const degradedDocs = (extraFields: Record<string, unknown> = {}) =>
  timerange(INGEST_FROM, INGEST_TO)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      logDoc
        .create()
        .dataset(DATASET)
        .message('a log message')
        .logLevel(MORE_THAN_1024_CHARS)
        .service(SERVICE_NAME)
        .namespace(DEFAULT_NAMESPACE)
        .defaults({
          'service.name': SERVICE_NAME,
          'trace.id': generateShortId(),
          test_field: [MORE_THAN_1024_CHARS, ANOTHER_1024_CHARS],
          ...extraFields,
        })
        .timestamp(timestamp)
    );

const docsCountByField = (rows: Array<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(
    rows.map((row) => [
      row[testData.QUALITY_ISSUE_COLUMNS.name],
      row[testData.QUALITY_ISSUE_COLUMNS.docsCount],
    ])
  );

test.describe(
  'Dataset quality details - character limit root cause',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient, logsSynthtraceEsClient }) => {
      await createComponentTemplate(esClient, {
        name: COMPONENT_TEMPLATE,
        mappings: logsSynthMappings(),
      });

      await createIndexTemplate(esClient, {
        name: INDEX_TEMPLATE,
        indexPatterns: [DATA_STREAM],
        // Order matters: the built-in templates come last so they win on conflicts.
        composedOf: [COMPONENT_TEMPLATE, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
      });

      // 1. Only character limit issues: `log.level` and `test_field` are both over
      //    the 1024 character `ignore_above` of the pinned mappings.
      await logsSynthtraceEsClient.index(degradedDocs());

      await setDataStreamSettings(esClient, DATA_STREAM, {
        'mapping.total_fields.limit': FIELD_LIMIT_FIRST_INDEX,
      });

      // 2. Adds `cloud.project.id`, which no longer fits the field limit, so this
      //    backing index also reports a `cloud` field limit issue.
      await logsSynthtraceEsClient.index(
        degradedDocs({
          test_field: [MORE_THAN_1024_CHARS, 'hello world'],
          'cloud.project.id': generateShortId(),
        })
      );

      // The rollover resets the limit to the default of 1000, so set it again on the
      // new backing index.
      await rolloverDataStream(esClient, DATA_STREAM);
      await setDataStreamSettings(esClient, await getWriteBackingIndexName(esClient, DATA_STREAM), {
        'mapping.total_fields.limit': FIELD_LIMIT_LATEST_INDEX,
      });

      // 3. The same documents in the latest backing index, where the extra slot lets
      //    `cloud` through and the issue is reported as `cloud.project` instead.
      await logsSynthtraceEsClient.index(
        degradedDocs({
          test_field: [MORE_THAN_1024_CHARS, 'hello world'],
          'cloud.project.id': generateShortId(),
        })
      );
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    // Deleting the data stream also drops its extra backing index and field-limit
    // settings.
    test.afterAll(async ({ esClient, log }) => {
      await deleteDataStreamIfExists(esClient, DATA_STREAM, log);
      await deleteIndexTemplateIfExists(esClient, INDEX_TEMPLATE, log);
      await deleteComponentTemplateIfExists(esClient, COMPONENT_TEMPLATE, log);
    });

    test('lists past or current quality issues depending on the toggle', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await datasetQualityDetails.goto({ dataStream: DATA_STREAM, timeRange: TIME_RANGE });

      await test.step('reports issues from every backing index by default', async () => {
        expect(await datasetQualityDetails.isCurrentQualityIssuesToggleChecked()).toBe(false);

        await expect
          .poll(async () => docsCountByField(await datasetQualityDetails.parseQualityIssuesTable()))
          .toStrictEqual({
            'log.level': '15',
            test_field: '15',
            cloud: '5',
            'cloud.project': '5',
          });
      });

      await test.step('the flyout counts documents from every backing index', async () => {
        await datasetQualityDetails.openQualityIssueFlyout(CHARACTER_LIMIT_FIELD);
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.docCount)).toHaveText('15');
        await datasetQualityDetails.closeFlyout();
      });

      await test.step('reports only issues of the latest backing index when toggled on', async () => {
        await datasetQualityDetails.toggleCurrentQualityIssues();

        expect(await datasetQualityDetails.isCurrentQualityIssuesToggleChecked()).toBe(true);

        await expect
          .poll(async () => docsCountByField(await datasetQualityDetails.parseQualityIssuesTable()))
          .toStrictEqual({
            'log.level': '5',
            test_field: '5',
            'cloud.project': '5',
          });
      });

      await test.step('the flyout counts documents of the latest backing index', async () => {
        await datasetQualityDetails.openQualityIssueFlyout(CHARACTER_LIMIT_FIELD);
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.docCount)).toHaveText('5');
      });

      await test.step('starts toggled on when the URL state says so', async () => {
        await gotoDetails(page, { showCurrentQualityIssues: true });

        await expect
          .poll(async () => datasetQualityDetails.isCurrentQualityIssuesToggleChecked())
          .toBe(true);
      });
    });

    test('closes the flyout for an issue missing from the latest backing index', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await test.step('when the URL expands a past issue and asks for current ones', async () => {
        await gotoDetails(page, { field: 'cloud', showCurrentQualityIssues: true });

        // Wait for the current-issues re-fetch to drop `cloud` (a past-only issue) from
        // the table, which is the signal the flyout's auto-close reacts to, before
        // asserting the flyout is gone.
        await expect
          .poll(async () => await datasetQualityDetails.getQualityIssueNames())
          .not.toContain('cloud');

        await expect(datasetQualityDetails.degradedFieldFlyout).toBeHidden();
      });

      await test.step('when the toggle is switched on with a past issue expanded', async () => {
        await gotoDetails(page, { field: 'cloud' });

        await expect(datasetQualityDetails.degradedFieldFlyout).toBeVisible();

        await datasetQualityDetails.toggleCurrentQualityIssues();

        await expect(datasetQualityDetails.degradedFieldFlyout).toBeHidden();
      });
    });

    test('reports an exceeded field character limit as the root cause', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await gotoDetails(page, { field: CHARACTER_LIMIT_FIELD });

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.cause)).toContainText(
        testData.TEXTS.fieldCharacterLimitExceeded
      );

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.characterLimit)).toContainText(
        '1024'
      );

      const values = datasetQualityDetails.getFlyoutSection(FLYOUT.values);
      await expect(values).toBeVisible();

      // Both ignored values are rendered truncated, so expand the toggles of this
      // section only — the FTR suite clicked every toggle on the page.
      for (const toggle of await values.locator('[data-test-subj="truncatedTextToggle"]').all()) {
        await toggle.click();
      }

      await expect(values).toContainText(MORE_THAN_1024_CHARS);
      await expect(values).toContainText(ANOTHER_1024_CHARS);
    });

    test('offers the mitigations available for the view it is opened in', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;
      const nonIntegrationCustomName = `${LOGS_TYPE}@custom`;

      await test.step('manual mitigations for a data set of no integration', async () => {
        await gotoDetails(page, { field: CHARACTER_LIMIT_FIELD });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

        const componentTemplateLink = datasetQualityDetails.getFlyoutSection(
          FLYOUT.componentTemplateLink
        );
        await expect(componentTemplateLink).toBeVisible();
        // Points at the index template the data stream resolves to, not at a
        // component template, because no integration owns this data set.
        await expect(componentTemplateLink).toHaveAttribute(
          'data-test-url',
          `/data/index_management/templates/${INDEX_TEMPLATE}`
        );

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)
        ).toBeVisible();
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
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.modifyFieldValue)).toBeHidden();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseCharacterLimit)
        ).toBeHidden();
      });

      await test.step('stream mitigations for a wired stream', async () => {
        await gotoDetails(page, { field: CHARACTER_LIMIT_FIELD, view: 'wired' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

        // A wired stream is edited through its own definition, not through
        // component templates or ingest pipelines.
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.componentTemplateLink)
        ).toBeHidden();
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)).toBeHidden();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.modifyFieldValue)).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseCharacterLimit)
        ).toBeVisible();
      });

      await test.step('stream mitigations for a classic stream', async () => {
        await gotoDetails(page, { field: CHARACTER_LIMIT_FIELD, view: 'classic' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

        // A classic stream keeps the ingest pipeline mitigation on top of the
        // stream specific ones.
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)
        ).toBeVisible();
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.modifyFieldValue)).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseCharacterLimit)
        ).toBeVisible();
      });
    });
  }
);
