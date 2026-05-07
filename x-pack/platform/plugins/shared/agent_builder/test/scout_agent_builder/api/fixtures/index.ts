/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout';
import type { ApmSynthtraceFixtureClient, SynthtraceFixture } from '@kbn/scout-synthtrace';
import { getSynthtraceClient, synthtraceFixture } from '@kbn/scout-synthtrace';
import type {
  ApmFields,
  ApmSynthtracePipelines,
  SynthtraceGenerator,
} from '@kbn/synthtrace-client';
import type { AuthedApiClient } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { withAuth } from '../../../scout_agent_builder_shared/lib/authed_api_client';
import { COMMON_HEADERS } from './constants';

interface AgentBuilderApiWorkerFixtures extends ScoutWorkerFixtures {
  asAdmin: AuthedApiClient;
  asViewer: AuthedApiClient;
  asPrivilegedUser: AuthedApiClient;
}

export const apiTest = mergeTests(baseApiTest, synthtraceFixture).extend<
  ScoutTestFixtures,
  AgentBuilderApiWorkerFixtures & Pick<SynthtraceFixture, 'apmSynthtraceEsClient'>
>({
  // Override the default apmSynthtraceEsClient so it does NOT try to install
  // the APM Fleet package. Installing is forbidden on serverless search projects
  // (Fleet returns 403) and the FTR equivalent (`@kbn/synthtrace` default)
  apmSynthtraceEsClient: [
    async ({ esClient, config, kbnUrl, log }, use) => {
      const { apmEsClient } = await getSynthtraceClient(
        'apmEsClient',
        { esClient, kbnUrl: kbnUrl.get(), log, config },
        { skipInstallation: true }
      );

      const index = async (
        events: SynthtraceGenerator<ApmFields>,
        pipelineCallback?: (base: Readable) => NodeJS.WritableStream
      ) => {
        await apmEsClient.index(Readable.from(Array.from(events)), pipelineCallback);
      };

      const clean = async () => await apmEsClient.clean();

      const setPipeline: ApmSynthtraceFixtureClient['setPipeline'] =
        apmEsClient.setPipeline.bind(apmEsClient);

      const resolvePipelineType: ApmSynthtraceFixtureClient['resolvePipelineType'] = (
        pipeline: ApmSynthtracePipelines,
        options?
      ) => apmEsClient.resolvePipelineType(pipeline, options);

      await use({ index, clean, setPipeline, resolvePipelineType });
    },
    { scope: 'worker' },
  ],
  asAdmin: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
  asViewer: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForViewer();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
  asPrivilegedUser: [
    async ({ apiClient, requestAuth }, use) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
      await use(withAuth(apiClient, { ...COMMON_HEADERS, ...apiKeyHeader }));
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
