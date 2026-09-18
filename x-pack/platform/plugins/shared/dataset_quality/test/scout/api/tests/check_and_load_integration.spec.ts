/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { log, timerange } from '@kbn/synthtrace-client';

import type { CheckAndLoadIntegrationResponse } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import { PACKAGES, buildDataStreamName, cleanUpAll, indexLogs } from '../../common';

const START = '2024-11-04T11:00:00.000Z';
const END = '2024-11-04T11:01:00.000Z';

/** Not backed by any package: the global `logs` index template applies. */
const REGULAR_DATASET = 'dq.api.check';
/** Owned by the pinned nginx package installed below. */
const NGINX_DATASET = 'nginx.access';
/**
 * Matches the `logs-apm.app@template` index template that Elasticsearch's
 * apm-data plugin installs. This suite therefore assumes those assets are
 * already present in the deployment — nothing here installs them, exactly like
 * the FTR suite it was ported from.
 */
const APM_APP_DATASET = 'apm.app.dqcheck';

const REGULAR_DATA_STREAM = buildDataStreamName({ dataset: REGULAR_DATASET });
const NGINX_DATA_STREAM = buildDataStreamName({ dataset: NGINX_DATASET });
const APM_APP_DATA_STREAM = buildDataStreamName({ dataset: APM_APP_DATASET });

const generateLogsForDataset = (dataset: string) =>
  timerange(START, END)
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log.create().message('This is a log message').timestamp(timestamp).dataset(dataset).defaults({
        'log.file.path': '/my-service.log',
        'service.name': 'my-service',
        'host.name': 'synth-host',
      })
    );

/**
 * Narrows the response to the installed-integration branch of the union, the only one
 * carrying `integration`. Throws if the response is the other shape.
 */
function assertIsIntegration(
  body: CheckAndLoadIntegrationResponse
): asserts body is Extract<CheckAndLoadIntegrationResponse, { isIntegration: true }> {
  if (!body.isIntegration) {
    throw new Error('Expected the response to describe an installed integration');
  }
}

apiTest.describe(
  'Dataset quality - check and load integration',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await apiServices.fleet.integration.installPackage(
        PACKAGES.nginx.name,
        PACKAGES.nginx.version
      );

      await indexLogs(logsSynthtraceEsClient, [
        generateLogsForDataset(NGINX_DATASET),
        generateLogsForDataset(APM_APP_DATASET),
        generateLogsForDataset(REGULAR_DATASET),
      ]);
    });

    apiTest.afterAll(async ({ apiServices, logsSynthtraceEsClient }) => {
      await cleanUpAll([
        () => logsSynthtraceEsClient.clean(),
        () => apiServices.fleet.integration.delete(PACKAGES.nginx.name),
      ]);
    });

    apiTest(
      'returns integration as false for a regular data stream',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(testData.API.integrationCheck(REGULAR_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body: CheckAndLoadIntegrationResponse = response.body;
        expect(body.isIntegration).toBe(false);
        expect(body.areAssetsAvailable).toBe(false);
      }
    );

    apiTest(
      'returns integration as true for the nginx data stream as the integration is installed',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(testData.API.integrationCheck(NGINX_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body: CheckAndLoadIntegrationResponse = response.body;
        expect(body.isIntegration).toBe(true);
        expect(body.areAssetsAvailable).toBe(true);

        assertIsIntegration(body);
        expect(body.integration.name).toBe(PACKAGES.nginx.name);
        expect(typeof body.integration.datasets?.[NGINX_DATASET]).toBe('string');
      }
    );

    apiTest(
      'returns integration as false but assets as available for the apm app data stream as it is preinstalled',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(testData.API.integrationCheck(APM_APP_DATA_STREAM), {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body: CheckAndLoadIntegrationResponse = response.body;
        expect(body.isIntegration).toBe(false);
        expect(body.areAssetsAvailable).toBe(true);
      }
    );
  }
);
