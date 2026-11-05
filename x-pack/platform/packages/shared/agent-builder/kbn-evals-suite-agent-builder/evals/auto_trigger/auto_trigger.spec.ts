/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { tags } from '@kbn/scout';
import { AutoTriggerClient } from '../../src/auto_trigger/auto_trigger_client';
import { autoTriggerEvaluators } from '../../src/auto_trigger/auto_trigger_evaluators';
import type { AutoTriggerExample } from './auto_trigger_dataset';
import { ADDRESSEE_EXAMPLES, DESCRIPTION_EXAMPLES } from './auto_trigger_dataset';

type EvaluateAutoTrigger = (params: {
  name: string;
  examples: AutoTriggerExample[];
}) => Promise<void>;

const evaluate = evalsBase.extend<
  {},
  { autoTriggerClient: AutoTriggerClient; evaluateAutoTrigger: EvaluateAutoTrigger }
>({
  autoTriggerClient: [
    async (
      { kbnClient, esClient, traceEsClient, log, config, connector, evaluationConnector },
      use
    ) => {
      const client = new AutoTriggerClient({
        kbnClient,
        esClient,
        traceEsClient,
        log,
        kibanaUrl: config.hosts.kibana,
        connectorId: connector.id,
        agentConnectorId: evaluationConnector.id,
      });

      await client.setUp();
      await use(client);
      await client.tearDown();
    },
    { scope: 'worker' },
  ],
  evaluateAutoTrigger: [
    async ({ autoTriggerClient, executorClient }, use) => {
      await use(async ({ name, examples }) => {
        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: `auto-trigger: ${name}`,
                description:
                  "Whether trigger_mode 'auto' lets the agent respond in a shared conversation, decided by the decision provider the Kibana config selects.",
                examples,
              },
            ],
            task: async ({ input }) => {
              if (!input) {
                throw new Error('Auto trigger examples need an input');
              }

              return autoTriggerClient.run(input);
            },
          },
          autoTriggerEvaluators
        );
      });
    },
    { scope: 'worker' },
  ],
});

evaluate.describe("Agent Builder trigger_mode 'auto'", { tag: tags.stateful.classic }, () => {
  evaluate('who the message is for', async ({ evaluateAutoTrigger }) => {
    await evaluateAutoTrigger({ name: 'addressee', examples: ADDRESSEE_EXAMPLES });
  });

  evaluate("the agent's description", async ({ evaluateAutoTrigger }) => {
    await evaluateAutoTrigger({ name: 'description', examples: DESCRIPTION_EXAMPLES });
  });
});
