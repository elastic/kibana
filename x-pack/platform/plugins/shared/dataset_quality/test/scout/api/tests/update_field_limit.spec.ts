/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import type { UpdateFieldLimitResponse } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import {
  cleanUpAll,
  LOGS_TYPE,
  PACKAGES,
  buildDataStreamName,
  deleteComponentTemplateIfExists,
  getBackingIndexNames,
  rolloverDataStream,
} from '../../common';

const START = '2024-10-17T11:00:00.000Z';
const END = '2024-10-17T11:01:00.000Z';

/** Owned by the pinned nginx package installed below. */
const INTEGRATION_DATASET = 'nginx.access';
const INTEGRATION_DATA_STREAM = buildDataStreamName({ dataset: INTEGRATION_DATASET });
const INVALID_DATA_STREAM = buildDataStreamName({ dataset: 'dq.api.update.field.limit.invalid' });

const CUSTOM_COMPONENT_TEMPLATE_NAME = `${LOGS_TYPE}-${INTEGRATION_DATASET}@custom`;

const NEW_FIELD_LIMIT = 50;
/** `logs@settings` ships this as the default `total_fields.limit`. */
const DEFAULT_FIELD_LIMIT = '1000';

apiTest.describe(
  'Dataset quality - update field limit',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.fleet.integration.installPackage(
        PACKAGES.nginx.name,
        PACKAGES.nginx.version
      );

      await logsSynthtraceEsClient.index(
        timerange(START, END)
          .interval('1m')
          .rate(1)
          .generator((timestamp) =>
            log
              .create()
              .message('This is a log message')
              .timestamp(timestamp)
              .dataset(INTEGRATION_DATASET)
              .defaults({
                'log.file.path': '/my-service.log',
                'service.name': 'my-service',
                'host.name': 'synth-host',
              })
          )
      );
    });

    apiTest.afterAll(async ({ apiServices, esClient, log: logger, logsSynthtraceEsClient }) => {
      try {
        await cleanUpAll([
          () => logsSynthtraceEsClient.clean(),
          () => apiServices.fleet.integration.delete(PACKAGES.nginx.name),
        ]);
      } finally {
        // Has to come last: Elasticsearch refuses to delete a component template
        // while the package index template that composes it still exists.
        await deleteComponentTemplateIfExists(esClient, CUSTOM_COMPONENT_TEMPLATE_NAME, logger);
      }
    });

    apiTest(
      'handles failure gracefully when an invalid data stream is provided',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.put(testData.API.updateFieldLimit(INVALID_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          body: { newFieldLimit: 10 },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(400);
        // The 400 path returns Kibana's error envelope, not `UpdateFieldLimitResponse`.
        const body = response.body as { message: string };
        expect(body.message).toBe(
          `Data stream does not exists. Received value "${INVALID_DATA_STREAM}"`
        );
      }
    );

    /**
     * One sequential flow on purpose: every assertion below observes the state
     * left behind by the previous rollover, so the steps cannot be split into
     * independent tests without redoing the whole setup each time.
     */
    apiTest(
      'updates the last backing index and the custom component template',
      async ({ apiClient, esClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        await apiTest.step('rolls the data stream over to get a second backing index', async () => {
          await rolloverDataStream(esClient, INTEGRATION_DATA_STREAM);

          const backingIndexNames = await getBackingIndexNames(esClient, INTEGRATION_DATA_STREAM);
          expect(backingIndexNames).toHaveLength(2);
        });

        await apiTest.step('acknowledges the new field limit', async () => {
          const response = await apiClient.put(
            testData.API.updateFieldLimit(INTEGRATION_DATA_STREAM),
            {
              headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
              body: { newFieldLimit: NEW_FIELD_LIMIT },
              responseType: 'json',
            }
          );

          expect(response).toHaveStatusCode(200);
          const body: UpdateFieldLimitResponse = response.body;
          expect(body.isComponentTemplateUpdated).toBe(true);
          expect(body.isLatestBackingIndexUpdated).toBe(true);
          expect(body.customComponentTemplateName).toBe(CUSTOM_COMPONENT_TEMPLATE_NAME);
          expect(body.error).toBeUndefined();
        });

        await apiTest.step('writes the new limit to the custom component template', async () => {
          const { component_templates: componentTemplates } =
            await esClient.cluster.getComponentTemplate({ name: CUSTOM_COMPONENT_TEMPLATE_NAME });

          const customTemplates = componentTemplates.filter(
            ({ name }) => name === CUSTOM_COMPONENT_TEMPLATE_NAME
          );

          expect(customTemplates).toHaveLength(1);
          expect(
            customTemplates[0].component_template.template.settings?.index?.mapping?.total_fields
              ?.limit
          ).toBe(String(NEW_FIELD_LIMIT));
        });

        await apiTest.step('updates only the last backing index', async () => {
          const backingIndexNames = await getBackingIndexNames(esClient, INTEGRATION_DATA_STREAM);
          const [previousBackingIndex, lastBackingIndex] = backingIndexNames;

          const settingsForAllIndices = await esClient.indices.getSettings({
            index: INTEGRATION_DATA_STREAM,
          });

          expect(
            settingsForAllIndices[lastBackingIndex].settings?.index?.mapping?.total_fields?.limit
          ).toBe(String(NEW_FIELD_LIMIT));

          // The one before it keeps the default limit.
          expect(
            settingsForAllIndices[previousBackingIndex].settings?.index?.mapping?.total_fields
              ?.limit
          ).toBe(DEFAULT_FIELD_LIMIT);
        });

        await apiTest.step(
          'applies the custom component template to a newly rolled over backing index',
          async () => {
            await rolloverDataStream(esClient, INTEGRATION_DATA_STREAM);

            const backingIndexNames = await getBackingIndexNames(esClient, INTEGRATION_DATA_STREAM);
            expect(backingIndexNames).toHaveLength(3);

            const latestBackingIndex = backingIndexNames[backingIndexNames.length - 1];
            const settingsForLatestBackingIndex = await esClient.indices.getSettings({
              index: latestBackingIndex,
            });

            expect(
              settingsForLatestBackingIndex[latestBackingIndex].settings?.index?.mapping
                ?.total_fields?.limit
            ).toBe(String(NEW_FIELD_LIMIT));
          }
        );
      }
    );
  }
);
