/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { createHash } from 'crypto';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

interface InstallationStatusResponse {
  overall: 'installed' | 'uninstalled' | 'installing' | 'uninstalling' | string;
}

interface PerformInstallResponse {
  installed: boolean;
}

const inferenceId = defaultInferenceEndpoints.ELSER;
const ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH = '/internal/product_doc_base/status';
const ELASTIC_DOCS_INSTALL_ALL_API_PATH = '/internal/product_doc_base/install';
const ELASTIC_DOCS_UNINSTALL_ALL_API_PATH = '/internal/product_doc_base/uninstall';

const AGENTS_API_BASE_PATH = '/api/agent_builder/agents';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('AgentBuilder product documentation tool', { tag: '@svlOblt' }, () => {
  let installedBySuite = false;
  let productDocAgentId: string | undefined;

  evaluate.beforeAll(async ({ fetch, log, connector }) => {
    // Ensure Elastic documentation is installed
    const status = (await fetch(
      `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(inferenceId)}`
    )) as InstallationStatusResponse;

    if (status.overall === 'installed') {
      log.debug('Elastic documentation already installed');
    } else {
      log.info('Installing Elastic documentation');
      const installResponse = (await fetch(ELASTIC_DOCS_INSTALL_ALL_API_PATH, {
        method: 'POST',
        body: JSON.stringify({ inferenceId }),
      })) as PerformInstallResponse;

      if (!installResponse.installed) {
        throw new Error('Documentation did not install successfully before running evaluations.');
      }

      const verify = (await fetch(
        `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(
          inferenceId
        )}`
      )) as InstallationStatusResponse;
      if (verify.overall !== 'installed') {
        throw new Error('Documentation is not fully installed, cannot proceed with evaluations.');
      }

      installedBySuite = true;
    }

    // Create a dedicated agent with ONLY the product documentation tool enabled
    // Agent ids are limited to 64 characters. Connector ids can be long (e.g. UUIDs),
    // so we hash the connector id and use a compact timestamp to keep this under the limit.
    const connectorHash = createHash('sha256').update(connector.id).digest('hex').slice(0, 8);
    const ts = Date.now().toString(36);
    const agentId = `eval_product_doc_${connectorHash}_${ts}`;

    await fetch(AGENTS_API_BASE_PATH, {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({
        id: agentId,
        name: 'Eval: Product documentation only',
        description: 'Evaluation agent restricted to the product documentation tool only.',
        configuration: {
          instructions: [
            'You are an evaluation agent.',
            `You MUST call the "${platformCoreTools.productDocumentation}" tool before answering.`,
            `You MUST use ONLY information returned by the "${platformCoreTools.productDocumentation}" tool.`,
            'If the tool output is insufficient to fully answer, explicitly say so and do not guess.',
            'In your final answer, include both the requested facts and a short, direct explanation.',
          ].join('\n'),
          tools: [{ tool_ids: [platformCoreTools.productDocumentation] }],
        },
      }),
    });

    productDocAgentId = agentId;
    log.debug(`Created eval agent: ${agentId}`);
  });

  evaluate.afterAll(async ({ fetch, log }) => {
    if (productDocAgentId) {
      try {
        await fetch(`${AGENTS_API_BASE_PATH}/${encodeURIComponent(productDocAgentId)}`, {
          method: 'DELETE',
          version: '2023-10-31',
        });
        log.debug(`Deleted eval agent: ${productDocAgentId}`);
      } catch (e) {
        log.warning(
          `Failed to delete eval agent "${productDocAgentId}": ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }

    if (installedBySuite) {
      try {
        await fetch(ELASTIC_DOCS_UNINSTALL_ALL_API_PATH, {
          method: 'POST',
          body: JSON.stringify({ inferenceId }),
        });
        log.debug('Uninstalled Elastic documentation');
      } catch (e) {
        log.warning(
          `Failed to uninstall Elastic documentation: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  });

  evaluate(
    'uses product documentation tool for Elastic docs questions',
    async ({ evaluateDataset }) => {
      if (!productDocAgentId) {
        throw new Error('Expected productDocAgentId to be set in beforeAll');
      }

      await evaluateDataset({
        dataset: {
          name: 'agent builder: product-documentation-tool',
          description:
            'Base evals for Agent Builder product documentation tool: tool-only usage + grounding constraints.',
          examples: [
            {
              input: {
                question: 'What is the latest version of Elasticsearch and when was it released?',
              },
              output: {
                expected:
                  'Answer includes the latest Elasticsearch version and its release date, based only on retrieved product documentation.',
              },
              metadata: {
                agentId: productDocAgentId,
                expectedOnlyToolId: platformCoreTools.productDocumentation,
                requireVersionAndReleaseDate: true,
                product: 'elasticsearch',
              },
            },
            {
              input: {
                question:
                  'Explain the relationship between Elasticsearch, Kibana, and Logstash, using only information obtained from the product documentation tool. If the tool response does not provide sufficient information, explicitly state that in the answer.',
              },
              output: {
                expected:
                  'Answer calls product documentation tool and explains relationship only using returned docs; if insufficient, explicitly states insufficiency.',
              },
              metadata: {
                agentId: productDocAgentId,
                expectedOnlyToolId: platformCoreTools.productDocumentation,
                product: 'kibana',
              },
            },
          ],
        },
      });
    }
  );
});
