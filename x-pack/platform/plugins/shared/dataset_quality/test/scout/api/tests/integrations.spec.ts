/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { v4 as uuid } from 'uuid';

import type { IntegrationType, IntegrationsResponse } from '../../../../common/api_types';
import { apiTest, testData } from '../fixtures';
import { cleanUpAll } from '../../common';

/**
 * Nothing asserted here is package-version specific — only that an installed
 * integration is listed together with a non-empty dataset map — so these are
 * installed at whatever version the registry currently serves as latest, the
 * same way the FTR suite did.
 */
const REGISTRY_PACKAGES = ['system', 'synthetics'] as const;

/**
 * Suffixed per run and prefixed per spec so a custom integration leaked by
 * another suite (or by a previous run) can neither satisfy nor break the
 * exhaustive assertions below.
 */
const CUSTOM_INTEGRATION_NAME = `dq.api.integrations-${uuid()}`;
// Fleet derives a custom integration title by capitalising every
// `_`-separated word of its name; this name has no underscores.
const CUSTOM_INTEGRATION_TITLE =
  CUSTOM_INTEGRATION_NAME.charAt(0).toUpperCase() + CUSTOM_INTEGRATION_NAME.slice(1);

const FLEET_PUBLIC_API_HEADERS = {
  ...testData.COMMON_HEADERS,
  'elastic-api-version': '2023-10-31',
} as const;

const getIntegrationNames = (integrations: IntegrationType[]) =>
  integrations.map(({ name }) => name).sort();

apiTest.describe(
  'Dataset quality - integrations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let preExistingIntegrationNames: string[];

    apiTest.beforeAll(async ({ apiClient, apiServices, requestAuth, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      // The assertions below are exhaustive, so they have to be relative to
      // whatever the deployment already ships with.
      const response = await apiClient.get(testData.API.INTEGRATIONS, {
        headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const { integrations }: IntegrationsResponse = response.body;
      preExistingIntegrationNames = getIntegrationNames(integrations);

      await Promise.all(
        REGISTRY_PACKAGES.map(async (name) => {
          const { data } = (await apiServices.fleet.integration.getPackage(name)) as {
            data: { item: { latestVersion: string } };
          };

          await apiServices.fleet.integration.installPackage(name, data.item.latestVersion);
        })
      );

      // `apiServices.fleet.integration.install` hardcodes a three-dataset shape,
      // so the public custom-integrations route is called directly to install
      // the single dataset this suite asserts on.
      const adminApiKey = await requestAuth.getApiKeyForAdmin();
      const installResponse = await apiClient.post('/api/fleet/epm/custom_integrations', {
        headers: { ...FLEET_PUBLIC_API_HEADERS, ...adminApiKey.apiKeyHeader },
        body: {
          integrationName: CUSTOM_INTEGRATION_NAME,
          datasets: [{ name: CUSTOM_INTEGRATION_NAME, type: 'logs' }],
        },
        responseType: 'json',
      });
      expect(installResponse).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await cleanUpAll([
        ...REGISTRY_PACKAGES.map((name) => () => apiServices.fleet.integration.delete(name)),
        () => apiServices.fleet.integration.delete(CUSTOM_INTEGRATION_NAME),
      ]);
    });

    apiTest(
      'returns all installed integrations and their datasets map',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(testData.API.INTEGRATIONS, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { integrations }: IntegrationsResponse = response.body;

        // Union, not concatenation: a deployment may ship `system` or `synthetics`
        // pre-installed, in which case it is already in `preExistingIntegrationNames`
        // and concatenating would expect a duplicate the API never returns.
        const expectedNames = [
          ...new Set([
            ...preExistingIntegrationNames,
            ...REGISTRY_PACKAGES,
            CUSTOM_INTEGRATION_NAME,
          ]),
        ].sort();

        expect(getIntegrationNames(integrations)).toStrictEqual(expectedNames);

        for (const packageName of REGISTRY_PACKAGES) {
          const installed = integrations.find(({ name }) => name === packageName);
          expect(Object.keys(installed?.datasets ?? {}).length).toBeGreaterThan(0);
        }
      }
    );

    apiTest(
      'returns custom integrations and their datasets map',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(testData.API.INTEGRATIONS, {
          headers: { ...testData.COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { integrations }: IntegrationsResponse = response.body;

        const customIntegration = integrations.find(({ name }) => name === CUSTOM_INTEGRATION_NAME);

        expect(customIntegration?.datasets).toStrictEqual({
          [CUSTOM_INTEGRATION_NAME]: CUSTOM_INTEGRATION_TITLE,
        });
      }
    );
  }
);
