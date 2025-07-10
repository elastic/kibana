/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClient } from '@arizeai/phoenix-client';
import {
  getConnectorModel,
  type BoundInferenceClient,
  InferenceConnectorType,
  getConnectorFamily,
  getConnectorProvider,
  InferenceConnector,
} from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { test as base } from '@kbn/scout';
import { isAxiosError } from 'axios';
import { v5 } from 'uuid';
import { HttpHandler } from '@kbn/core/public';
import { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';
import { createCriteriaEvaluator } from './evaluators/criteria';
import { DefaultEvaluators } from './types';

/**
 * Test type for evaluations. Loads an inference client and a
 * (Kibana-flavored) Phoenix client.
 */
export const evaluate = base.extend<
  {},
  {
    inferenceClient: BoundInferenceClient;
    phoenixClient: KibanaPhoenixClient;
    evaluators: DefaultEvaluators;
    fetch: HttpHandler;
    connector: AvailableConnectorWithId;
  }
>({
  fetch: [
    async ({ kbnClient, log }, use) => {
      // add a HttpHandler as a fixture, so consumers can use
      // modules that depend on it (like the inference client)
      const fetch = httpHandlerFromKbnClient({ kbnClient, log });
      await use(fetch);
    },
    { scope: 'worker' },
  ],
  connector: [
    async ({ fetch, log }, use, testInfo) => {
      const predefinedConnector = (testInfo.project.use as Pick<EvaluationTestOptions, 'connector'>)
        .connector;

      // When running locally, the connectors we read from kibana.yml
      // are not configured in the kibana instance, so we install the
      // one for this test run. only UUIDs are allowed for non-preconfigured
      // connectors, so we generate a seeded uuid using the preconfigured
      // connector id.
      const connectorIdAsUuid = v5(predefinedConnector.id, v5.DNS);

      const connectorWithUuid = {
        ...predefinedConnector,
        id: connectorIdAsUuid,
      };

      async function deleteConnector() {
        await fetch({
          path: `/api/actions/connector/${connectorIdAsUuid}`,
          method: 'DELETE',
        }).catch((error) => {
          if (isAxiosError(error) && error.status === 404) {
            return;
          }
          throw error;
        });
      }

      log.info(`Deleting existing connector`);

      await deleteConnector();

      log.info(`Creating connector`);

      await fetch({
        path: `/api/actions/connector/${connectorWithUuid.id}`,
        method: 'POST',
        body: JSON.stringify({
          config: connectorWithUuid.config,
          connector_type_id: connectorWithUuid.actionTypeId,
          name: connectorWithUuid.name,
          secrets: connectorWithUuid.secrets,
        }),
      });

      await use(connectorWithUuid);

      // teardown
      await deleteConnector();
    },
    {
      scope: 'worker',
    },
  ],
  inferenceClient: [
    async ({ kbnClient, log, fetch, connector }, use, testInfo) => {
      log.info('Loading inference client');

      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId: connector.id,
        },
      });
      log.serviceLoaded?.('inferenceClient');

      await use(inferenceClient);
    },
    { scope: 'worker' },
  ],
  phoenixClient: [
    async ({ log, connector }, use) => {
      const config = getPhoenixConfig();

      const inferenceConnector: InferenceConnector = {
        type: connector.actionTypeId as InferenceConnectorType,
        config: connector.config,
        connectorId: connector.id,
        name: connector.name,
      };

      const phoenixClient = new KibanaPhoenixClient(
        createClient({
          options: config,
        }),
        log,
        {
          family: getConnectorFamily(inferenceConnector),
          provider: getConnectorProvider(inferenceConnector),
          id: getConnectorModel(inferenceConnector),
        }
      );

      await use(phoenixClient);
    },
    {
      scope: 'worker',
    },
  ],
  evaluators: [
    async ({ log, inferenceClient }, use) => {
      const evaluators: DefaultEvaluators = {
        criteria: (criteria) => {
          return createCriteriaEvaluator({
            inferenceClient,
            criteria,
            log,
          });
        },
      };
      await use(evaluators);
    },
    {
      scope: 'worker',
    },
  ],
});
