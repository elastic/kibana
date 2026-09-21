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
  CONSISTENT_TAGS,
  DEFAULT_NAMESPACE,
  LOGS_TYPE,
  MORE_THAN_1024_CHARS,
  PACKAGES,
  buildDataStreamName,
  createComponentTemplate,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  ensurePackageInstalled,
  getWriteBackingIndexName,
  indexLogs,
  logsApmAppMappings,
  logsNginxMappings,
  logsSynthMappings,
  rolloverDataStream,
  setDataStreamSettings,
  cleanUpAll,
} from '../../common';

/** Fixed so the ingested documents and the query window can never drift apart. */
const INGEST_FROM = '2024-06-01T11:55:00.000Z';
const INGEST_TO = '2024-06-01T12:00:00.000Z';
const TIME_RANGE = {
  from: '2024-06-01T11:00:00.000Z',
  to: '2024-06-01T13:00:00.000Z',
  refresh: { pause: true, value: 60000 },
} as const;

const SERVICE_NAME = 'test_service';

/** Data set of no integration, owned by this spec only. */
const SYNTH_DATASET = 'synth.degraded.fieldlimit';
const SYNTH_DATA_STREAM = buildDataStreamName({ dataset: SYNTH_DATASET });
const SYNTH_COMPONENT_TEMPLATE = 'logs-synth-fieldlimit@mappings';
/**
 * Has to match the data stream name: for a data set that belongs to no integration
 * the flyout links to the index template the data stream resolves to.
 */
const SYNTH_INDEX_TEMPLATE = SYNTH_DATA_STREAM;

/** Integration data set. The names are dictated by the installed nginx package. */
const NGINX_DATASET = 'nginx.access';
const NGINX_DATA_STREAM = buildDataStreamName({ dataset: NGINX_DATASET });
const NGINX_COMPONENT_TEMPLATE = `${LOGS_TYPE}-${NGINX_DATASET}@custom`;

/**
 * A "special package" data set: no package is installed for it, the index template
 * below fakes one by declaring itself managed. Its name has two dash separated parts
 * so the app treats the `@custom` component template as a dedicated one.
 */
const APM_DATASET = 'apm.app.fieldlimit';
const APM_DATA_STREAM = buildDataStreamName({ dataset: APM_DATASET });
const APM_INDEX_TEMPLATE = `${LOGS_TYPE}-${APM_DATASET}`;
const APM_COMPONENT_TEMPLATE = `${APM_INDEX_TEMPLATE}@custom`;

/**
 * Each limit is derived from its mapping fixture's field count (leaves, their parent
 * objects and multi-fields all count towards `mapping.total_fields.limit`).
 *
 * The first backing index's limit matches or undercuts that count, so the second
 * ingest's whole `cloud` object is rejected and reported as `cloud`. The rollover's
 * index leaves room for `cloud`, so the third ingest is reported a level deeper — as
 * `cloud.project`, or `cloud.project.id` for nginx where `cloud` is already mapped.
 */
const SYNTH_MAPPED_FIELD_COUNT = 25;
const NGINX_MAPPED_FIELD_COUNT = 42;
const APM_MAPPED_FIELD_COUNT = 27;

const SYNTH_FIELD_LIMIT_FIRST_INDEX = SYNTH_MAPPED_FIELD_COUNT;
const SYNTH_FIELD_LIMIT_LATEST_INDEX = SYNTH_MAPPED_FIELD_COUNT + 1;
const NGINX_FIELD_LIMIT_FIRST_INDEX = NGINX_MAPPED_FIELD_COUNT;
const NGINX_FIELD_LIMIT_LATEST_INDEX = NGINX_MAPPED_FIELD_COUNT + 1;
/** One below the mapped count, so even `cloud` itself does not fit. */
const APM_FIELD_LIMIT_FIRST_INDEX = APM_MAPPED_FIELD_COUNT - 1;
const APM_FIELD_LIMIT_LATEST_INDEX = APM_MAPPED_FIELD_COUNT + 1;

/** The app proposes a limit 30% above the current one. */
const PROPOSED_FIELD_LIMIT = Math.round(NGINX_FIELD_LIMIT_LATEST_INDEX * 1.3);

const FLYOUT = {
  cause: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-cause',
  mappingLimit: 'datasetQualityDetailsDegradedFieldFlyoutFieldValue-mappingLimit',
  issueDoesNotExist: 'datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist',
  mitigationTitle: 'datasetQualityDetailsDegradedFieldFlyoutPossibleMitigationTitle',
  componentTemplateLink: 'datasetQualityManualMitigationsCustomComponentTemplateLink',
  pipelineAccordion: 'datasetQualityManualMitigationsPipelineAccordion',
  pipelineName: 'datasetQualityManualMitigationsPipelineName',
  pipelineLink: 'datasetQualityManualMitigationsPipelineLink',
  documentationLink: 'datasetQualityManualMitigationsPipelineOfficialDocumentationLink',
  modifyFieldValue: 'datasetQualityDetailsFlyoutModifyFieldValueAccordion',
  increaseCharacterLimit: 'datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordion',
  fieldLimitAccordion: 'datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion',
  increaseFieldLimitPanel: 'datasetQualityDetailsDegradedFieldFlyoutIncreaseFieldLimitPanel',
  currentLimitInput: 'datasetQualityIncreaseFieldMappingCurrentLimitFieldText',
  proposedLimitInput: 'datasetQualityIncreaseFieldMappingProposedLimitFieldText',
  applyLimitButton: 'datasetQualityIncreaseFieldMappingLimitButton',
  newLimitSuccessCallout: 'datasetQualityDetailsDegradedFlyoutNewLimitSetSuccessCallout',
  newLimitComponentTemplateLink:
    'datasetQualityDetailsDegradedFlyoutNewLimitSetCheckComponentTemplate',
  newLimitErrorCallout: 'datasetQualityDetailsNewFieldLimitErrorCallout',
} as const;

/**
 * Opens the details page with a quality issue already expanded from URL state.
 *
 * TODO(https://github.com/elastic/kibana/issues/287030): collapse onto
 * `pageObjects.datasetQualityDetails.goto`, which already models this state.
 */
const gotoDetails = async (
  page: ScoutPage,
  { dataStream, field }: { dataStream: string; field: string }
): Promise<void> => {
  const state = {
    v: 2,
    dataStream,
    timeRange: TIME_RANGE,
    expandedQualityIssue: { name: field, type: 'degraded' },
  };

  await page.gotoApp(testData.DATA_QUALITY_DETAILS_APP_PATH, {
    params: { [testData.DATA_QUALITY_URL_STATE_KEY]: rison.encode(state) },
  });
  await page.testSubj.locator('datasetDetailsContainer').waitFor({ state: 'visible' });
};

/** Every degraded document carries an over-long `log.level` and `test_field`. */
const degradedDocs = (dataset: string, extraFields: Record<string, unknown> = {}) =>
  timerange(INGEST_FROM, INGEST_TO)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      logDoc
        .create()
        .dataset(dataset)
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

/**
 * The APM pipelines run a geoip processor that appends its own error tag in CI.
 * Pinning `tags` (and `event.ingested`) keeps the document field count — and with it
 * every field limit assertion — deterministic.
 */
const apmDefaults = {
  'event.ingested': INGEST_TO,
  tags: CONSISTENT_TAGS,
};

const CLOUD_PROJECT_ID = { 'cloud.project.id': generateShortId() };

test.describe(
  'Dataset quality details - field limit root cause',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let uninstallNginx: () => Promise<void>;

    test.beforeAll(async ({ apiServices, esClient, logsSynthtraceEsClient }) => {
      await createComponentTemplate(esClient, {
        name: SYNTH_COMPONENT_TEMPLATE,
        mappings: logsSynthMappings(),
      });
      await createIndexTemplate(esClient, {
        name: SYNTH_INDEX_TEMPLATE,
        indexPatterns: [SYNTH_DATA_STREAM],
        // Order matters: the built-in templates come last so they win on conflicts.
        composedOf: [SYNTH_COMPONENT_TEMPLATE, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
      });

      uninstallNginx = await ensurePackageInstalled(
        apiServices.fleet.integration,
        PACKAGES.nginx.name,
        PACKAGES.nginx.version
      );
      // Pins the nginx field count instead of relying on what the package maps.
      await createComponentTemplate(esClient, {
        name: NGINX_COMPONENT_TEMPLATE,
        mappings: logsNginxMappings(NGINX_DATASET),
      });

      await createComponentTemplate(esClient, {
        name: APM_COMPONENT_TEMPLATE,
        mappings: logsApmAppMappings(),
      });
      // `managed: true` is what makes the app resolve the integration assets as
      // available for this data stream.
      await createIndexTemplate(esClient, {
        name: APM_INDEX_TEMPLATE,
        indexPatterns: [APM_DATA_STREAM],
        composedOf: [APM_COMPONENT_TEMPLATE, 'logs@mappings', 'logs@settings', 'ecs@mappings'],
        managed: true,
      });

      // 1. Only character limit issues, no field limit is in force yet.
      await indexLogs(logsSynthtraceEsClient, [
        degradedDocs(SYNTH_DATASET),
        degradedDocs(NGINX_DATASET),
        degradedDocs(APM_DATASET, apmDefaults),
      ]);

      await setDataStreamSettings(esClient, SYNTH_DATA_STREAM, {
        'mapping.total_fields.limit': SYNTH_FIELD_LIMIT_FIRST_INDEX,
      });
      await setDataStreamSettings(esClient, NGINX_DATA_STREAM, {
        'mapping.total_fields.limit': NGINX_FIELD_LIMIT_FIRST_INDEX,
      });
      await setDataStreamSettings(esClient, APM_DATA_STREAM, {
        'mapping.total_fields.limit': APM_FIELD_LIMIT_FIRST_INDEX,
      });

      // 2. `cloud.project.id` no longer fits, so these documents report a field
      //    limit issue in what will become the previous backing index.
      await indexLogs(logsSynthtraceEsClient, [
        degradedDocs(SYNTH_DATASET, CLOUD_PROJECT_ID),
        degradedDocs(NGINX_DATASET, CLOUD_PROJECT_ID),
        degradedDocs(APM_DATASET, { ...apmDefaults, ...CLOUD_PROJECT_ID }),
      ]);

      // The rollover resets the limit to the default of 1000, so set it again on
      // each new backing index.
      for (const [dataStream, limit] of [
        [SYNTH_DATA_STREAM, SYNTH_FIELD_LIMIT_LATEST_INDEX],
        [NGINX_DATA_STREAM, NGINX_FIELD_LIMIT_LATEST_INDEX],
        [APM_DATA_STREAM, APM_FIELD_LIMIT_LATEST_INDEX],
      ] as const) {
        await rolloverDataStream(esClient, dataStream);
        await setDataStreamSettings(
          esClient,
          await getWriteBackingIndexName(esClient, dataStream),
          { 'mapping.total_fields.limit': limit }
        );
      }

      // 3. The same documents in the latest backing index, where the extra slots let
      //    `cloud` through and the issue is reported one level deeper.
      await indexLogs(logsSynthtraceEsClient, [
        degradedDocs(SYNTH_DATASET, CLOUD_PROJECT_ID),
        degradedDocs(NGINX_DATASET, CLOUD_PROJECT_ID),
        degradedDocs(APM_DATASET, { ...apmDefaults, ...CLOUD_PROJECT_ID }),
      ]);
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    // Deleting the data streams also drops their extra backing indices and field-limit
    // settings. The nginx `@custom` component template goes too — the last test edits it.
    // One chain per data set; a failure in one still tears the others down. Each chain
    // stays ordered internally: a component template cannot be deleted while an index
    // template — or an installed package's template — composes it.
    test.afterAll(async ({ esClient, log }) => {
      await cleanUpAll([
        async () => {
          await deleteDataStreamIfExists(esClient, SYNTH_DATA_STREAM, log);
          await deleteIndexTemplateIfExists(esClient, SYNTH_INDEX_TEMPLATE, log);
          await deleteComponentTemplateIfExists(esClient, SYNTH_COMPONENT_TEMPLATE, log);
        },
        async () => {
          await deleteDataStreamIfExists(esClient, NGINX_DATA_STREAM, log);
          await uninstallNginx();
          await deleteComponentTemplateIfExists(esClient, NGINX_COMPONENT_TEMPLATE, log);
        },
        async () => {
          await deleteDataStreamIfExists(esClient, APM_DATA_STREAM, log);
          await deleteIndexTemplateIfExists(esClient, APM_INDEX_TEMPLATE, log);
          await deleteComponentTemplateIfExists(esClient, APM_COMPONENT_TEMPLATE, log);
        },
      ]);
    });

    test('reports an exceeded field limit as the root cause of a past issue', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await gotoDetails(page, { dataStream: SYNTH_DATA_STREAM, field: 'cloud' });

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.cause)).toContainText(
        'Field limit exceeded'
      );

      // The limit of the backing index the issue was found in, not the current one.
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mappingLimit)).toContainText(
        String(SYNTH_FIELD_LIMIT_FIRST_INDEX)
      );

      // `cloud` only exists in the previous backing index, so the flyout warns that
      // the issue is no longer occurring.
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.issueDoesNotExist)).toBeVisible();
    });

    test('offers increasing the field limit only where the assets can be edited', async ({
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await test.step('for an integration', async () => {
        await gotoDetails(page, {
          dataStream: NGINX_DATA_STREAM,
          field: 'cloud.project.id',
        });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.fieldLimitAccordion)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseFieldLimitPanel)
        ).toBeVisible();

        const documentationLink = datasetQualityDetails.getFlyoutSection(FLYOUT.documentationLink);
        await expect(documentationLink).toBeVisible();
        expect(await documentationLink.getAttribute('href')).toContain('mapping');
      });

      await test.step('for a special package such as the APM app', async () => {
        await gotoDetails(page, { dataStream: APM_DATA_STREAM, field: 'cloud.project' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.fieldLimitAccordion)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseFieldLimitPanel)
        ).toBeVisible();

        const documentationLink = datasetQualityDetails.getFlyoutSection(FLYOUT.documentationLink);
        await expect(documentationLink).toBeVisible();
        expect(await documentationLink.getAttribute('href')).toContain('mapping');
      });

      await test.step('but not for a data set of no integration', async () => {
        await gotoDetails(page, { dataStream: SYNTH_DATA_STREAM, field: 'cloud.project' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.fieldLimitAccordion)
        ).toBeVisible();

        // There is no component template of an integration to raise the limit in, so
        // only the documentation is offered.
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseFieldLimitPanel)
        ).toBeHidden();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.documentationLink)
        ).toBeVisible();
      });
    });

    test('offers integration specific manual mitigations', async ({ page, pageObjects }) => {
      const { datasetQualityDetails } = pageObjects;

      await gotoDetails(page, { dataStream: NGINX_DATA_STREAM, field: 'test_field' });
      await datasetQualityDetails.waitUntilMitigationsLoaded();

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.mitigationTitle)).toBeVisible();

      const componentTemplateLink = datasetQualityDetails.getFlyoutSection(
        FLYOUT.componentTemplateLink
      );
      await expect(componentTemplateLink).toBeVisible();
      // Points at the integration's `@custom` component template rather than at the
      // index template a non-integration data set would link to.
      await expect(componentTemplateLink).toHaveAttribute(
        'data-test-url',
        `/data/index_management/component_templates/${encodeURIComponent(NGINX_COMPONENT_TEMPLATE)}`
      );

      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineAccordion)).toBeVisible();
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineName)).toHaveValue(
        NGINX_COMPONENT_TEMPLATE
      );
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.pipelineLink)).toHaveAttribute(
        'data-test-url',
        `/app/management/ingest/ingest_pipelines/?pipeline=${encodeURIComponent(
          NGINX_COMPONENT_TEMPLATE
        )}`
      );

      // Both accordions belong to the streams views only.
      await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.modifyFieldValue)).toBeHidden();
      await expect(
        datasetQualityDetails.getFlyoutSection(FLYOUT.increaseCharacterLimit)
      ).toBeHidden();
    });

    // Only the serverless FTR suite covered this, but the behaviour is not
    // deployment-specific: `loginAsPrivilegedUser` resolves to a role that lacks
    // component-template edit rights on both deployments, so it is left under the
    // describe's tags. A per-test deployment tag would be inert here anyway —
    // Playwright merges describe and test tags, so it could not narrow the selection.
    //
    // It needs a user without those privileges, so it cannot use the admin session the
    // other tests share; the fresh context of each test makes restoring it unnecessary.
    test('shows an error callout when the field limit cannot be raised', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      const { datasetQualityDetails } = pageObjects;

      await browserAuth.loginAsPrivilegedUser();

      await gotoDetails(page, { dataStream: NGINX_DATA_STREAM, field: 'cloud.project.id' });
      await datasetQualityDetails.waitUntilMitigationsLoaded();

      await datasetQualityDetails.getFlyoutSection(FLYOUT.applyLimitButton).click();

      await expect(
        datasetQualityDetails.getFlyoutSection(FLYOUT.newLimitErrorCallout)
      ).toBeVisible();
    });

    // Runs last: applying the new limit edits the nginx `@custom` component template,
    // which every assertion above on the current limit depends on.
    test('lets the user raise the field limit of an integration', async ({ page, pageObjects }) => {
      const { datasetQualityDetails } = pageObjects;

      await test.step('proposes a limit 30% above the current one', async () => {
        await gotoDetails(page, { dataStream: NGINX_DATA_STREAM, field: 'cloud.project.id' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        const currentLimit = datasetQualityDetails.getFlyoutSection(FLYOUT.currentLimitInput);
        await expect(currentLimit).toHaveValue(String(NGINX_FIELD_LIMIT_LATEST_INDEX));
        await expect(currentLimit).toBeDisabled();

        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.proposedLimitInput)).toHaveValue(
          String(PROPOSED_FIELD_LIMIT)
        );
        await expect(datasetQualityDetails.getFlyoutSection(FLYOUT.applyLimitButton)).toBeEnabled();
      });

      await test.step('rejects a limit below the current one', async () => {
        const proposedLimit = datasetQualityDetails.getFlyoutSection(FLYOUT.proposedLimitInput);
        await proposedLimit.fill(String(NGINX_FIELD_LIMIT_LATEST_INDEX - 1));

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.applyLimitButton)
        ).toBeDisabled();
        await expect(proposedLimit).toHaveAttribute('aria-invalid', 'true');
      });

      await test.step('applies the proposed limit to the component template', async () => {
        // Reload so the rejected value above is replaced by the proposed one again.
        await gotoDetails(page, { dataStream: NGINX_DATA_STREAM, field: 'cloud.project.id' });
        await datasetQualityDetails.waitUntilMitigationsLoaded();

        await datasetQualityDetails.getFlyoutSection(FLYOUT.applyLimitButton).click();

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.newLimitSuccessCallout)
        ).toBeVisible();

        const editedComponentTemplateLink = datasetQualityDetails.getFlyoutSection(
          FLYOUT.newLimitComponentTemplateLink
        );
        await expect(editedComponentTemplateLink).toBeVisible();
        expect(await editedComponentTemplateLink.getAttribute('href')).toContain(
          `/data/index_management/component_templates/${encodeURIComponent(
            NGINX_COMPONENT_TEMPLATE
          )}`
        );
      });

      await test.step('reports the issue as no longer occurring afterwards', async () => {
        await datasetQualityDetails.closeFlyout();

        // Re-navigating refetches the details page data, which is what the FTR suite
        // used its time range refresh for.
        await gotoDetails(page, { dataStream: NGINX_DATA_STREAM, field: 'cloud.project.id' });

        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.issueDoesNotExist)
        ).toBeVisible();
        await expect(
          datasetQualityDetails.getFlyoutSection(FLYOUT.increaseFieldLimitPanel)
        ).toBeHidden();
      });
    });
  }
);
