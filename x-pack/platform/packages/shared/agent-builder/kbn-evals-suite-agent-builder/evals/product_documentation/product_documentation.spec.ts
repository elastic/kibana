/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Product Documentation Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the product_documentation tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { platformCoreTools } from '@kbn/agent-builder-common';
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

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('AgentBuilder product documentation tool', { tag: '@svlOblt' }, () => {
  let installedBySuite = false;

  evaluate.beforeAll(async ({ fetch, log }) => {
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
  });

  evaluate.afterAll(async ({ fetch, log }) => {
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
                expected: `Provides version and release date from product docs, or states info unavailable.`,
              },
              metadata: {
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
                expected: `Explains the Elastic Stack components from product docs, or states docs insufficient.`,
              },
              metadata: {
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
