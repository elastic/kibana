/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClient } from '@arizeai/phoenix-client';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { createRestClient } from '@kbn/inference-plugin/common';
import { test as base } from '@kbn/scout';
import { isAxiosError } from 'axios';
import { v5 } from 'uuid';
import { getPhoenixConfig } from './utils/get_phoenix_config';
import { DefaultEvaluators } from './kibana_phoenix_client/types';
import { KibanaPhoenixClient } from './kibana_phoenix_client/client';
import { EvaluationTestOptions } from './config/create_playwright_eval_config';
import { httpHandlerFromKbnClient } from './utils/http_handler_from_kbn_client';

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
  }
>({
  inferenceClient: [
    async ({ kbnClient, log }, use, testInfo) => {
      const connector = (testInfo.project.use as Pick<EvaluationTestOptions, 'connector'>)
        .connector;

      log.info('Loading inference client');

      // the inference client expects an HttpHandler to call
      // out to Kibana
      const fetch = httpHandlerFromKbnClient({ kbnClient, log });

      // When running locally, the connectors we read from kibana.yml
      // are not configured in the kibana instance, so we install the
      // one for this test run. only UUIDs are allowed for non-preconfigured
      // connectors, so we generate a seeded uuid using the preconfigured
      // connector id.
      const connectorIdAsUuid = v5(connector.id, v5.DNS);

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
        path: `/api/actions/connector/${connectorIdAsUuid}`,
        method: 'POST',
        body: JSON.stringify({
          config: connector.config,
          connector_type_id: connector.actionTypeId,
          name: connector.name,
          secrets: connector.secrets,
        }),
      });

      const inferenceClient = createRestClient({
        fetch,
        bindTo: {
          connectorId: connectorIdAsUuid,
        },
      });
      log.serviceLoaded?.('inferenceClient');

      await use(inferenceClient);

      // teardown
      await deleteConnector();
    },
    { scope: 'worker' },
  ],
  phoenixClient: [
    async ({ log }, use) => {
      const config = getPhoenixConfig();

      const phoenixClient = new KibanaPhoenixClient(
        createClient({
          options: config,
        })
      );

      await use(phoenixClient);
    },
    {
      scope: 'worker',
    },
  ],
  evaluators: [
    async ({ log, inferenceClient }, use) => {
      const evaluators: DefaultEvaluators = {};
      await use(evaluators);
    },
    {
      scope: 'worker',
    },
  ],
});

export type { InferenceClient } from '@kbn/inference-common';
