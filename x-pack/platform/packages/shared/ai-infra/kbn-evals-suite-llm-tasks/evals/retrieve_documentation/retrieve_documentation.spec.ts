/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { containsAllTerms, evaluate, selectEvaluators } from '@kbn/evals';
import { SearchService } from '@kbn/product-doc-base-plugin/server/services/search/search_service';
import { retrieveDocumentation } from '@kbn/llm-tasks-plugin/server/tasks/retrieve_documentation';
import type { ProductName } from '@kbn/product-doc-common';

/**
 * NOTE: This suite is intentionally "task-level" (retriever-only):
 * - It calls the `retrieveDocumentation` task directly.
 * - It uses the real `product_doc_base` search implementation (no duplicated ES query DSL).
 *
 * The only HTTP calls performed are for (un)installing the docs package via existing product_doc_base endpoints.
 */

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

type RetrieverTaskDatasetExample = Example & {
  input: {
    searchTerm: string;
    products?: ProductName[];
  };
  metadata?: {
    minDocs?: number;
    requiredTerms?: string[];
  };
};

type RetrieveDocumentationTaskOutput = TaskOutput & {
  success: boolean;
  documents: Array<{
    title: string;
    url: string;
    content: string;
    summarized: boolean;
  }>;
};

const createNoopLogger = (): Logger =>
  ({
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    log: () => {},
    isLevelEnabled: () => false,
    get: () => createNoopLogger(),
  } as unknown as Logger);

evaluate.describe(
  'llm_tasks.retrieveDocumentation (task-level retriever evals)',
  { tag: '@svlOblt' },
  () => {
    let installedBySuite = false;

    evaluate.beforeAll(async ({ fetch, log }) => {
      const status = (await fetch(
        `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(
          inferenceId
        )}`
      )) as InstallationStatusResponse;

      if (status.overall === 'installed') {
        log.debug('Elastic documentation already installed');
        return;
      }

      log.info('Installing Elastic documentation');
      const installResponse = (await fetch(ELASTIC_DOCS_INSTALL_ALL_API_PATH, {
        method: 'POST',
        body: JSON.stringify({ inferenceId }),
      })) as PerformInstallResponse;

      if (!installResponse.installed) {
        throw new Error(
          'Documentation did not install successfully before running retriever evaluations.'
        );
      }

      const verify = (await fetch(
        `${ELASTIC_DOCS_INSTALLATION_STATUS_API_PATH}?inferenceId=${encodeURIComponent(
          inferenceId
        )}`
      )) as InstallationStatusResponse;

      if (verify.overall !== 'installed') {
        throw new Error(
          'Documentation is not fully installed, cannot proceed with retriever evaluations.'
        );
      }

      installedBySuite = true;
    });

    evaluate.afterAll(async ({ fetch, log }) => {
      if (!installedBySuite) return;
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
    });

    evaluate(
      'retrieves docs for baseline queries',
      async ({ phoenixClient, esClient, connector }) => {
        const logger = createNoopLogger();
        const searchService = new SearchService({
          logger,
          // product_doc_base expects Kibana's ElasticsearchClient, but Scout provides an ES client that is
          // compatible at runtime for `.search(...)`. Cast here to avoid duplicating query logic.
          esClient: esClient as unknown as ElasticsearchClient,
        });

        const task = retrieveDocumentation({
          logger,
          // We are not using `summarize` token reduction in this suite, so outputAPI won't be invoked.
          outputAPI: {} as any,
          searchDocAPI: (options) => searchService.search(options),
        });

        const dataset: {
          name: string;
          description: string;
          examples: RetrieverTaskDatasetExample[];
        } = {
          name: 'llmTasks: retrieve-documentation-task',
          description:
            'Task-level baseline for retrieveDocumentation (real product_doc_base search + task token reduction).',
          examples: [
            {
              input: {
                searchTerm: 'What is the latest version of Elasticsearch and when was it released?',
                products: ['elasticsearch'],
              },
              metadata: {
                minDocs: 1,
                requiredTerms: ['elasticsearch', 'version'],
              },
            },
            {
              input: {
                searchTerm:
                  'Explain the relationship between Elasticsearch, Kibana, and Logstash, using only information obtained from the product documentation.',
                // NOTE: `ProductName` currently only includes: kibana, elasticsearch, observability, security.
                // Logstash is still a relevant term for the query, but it's not a supported product filter.
                products: ['elasticsearch', 'kibana'],
              },
              metadata: {
                minDocs: 1,
                requiredTerms: ['elasticsearch', 'kibana', 'logstash'],
              },
            },
          ],
        };

        await phoenixClient.runExperiment(
          {
            dataset,
            task: async (
              example: RetrieverTaskDatasetExample
            ): Promise<RetrieveDocumentationTaskOutput> => {
              // `retrieveDocumentation` requires a KibanaRequest, but the task only needs it when using
              // inference APIs (e.g. summarize token reduction). This suite uses `highlight`, so a stub is fine.
              const request = {} as KibanaRequest;
              const result = await task({
                searchTerm: example.input.searchTerm,
                products: example.input.products,
                request,
                connectorId: connector.id,
                inferenceId,
                tokenReductionStrategy: 'highlight',
                // Keep defaults aligned with task behavior; suite-level evaluators will handle empty results.
              });

              return { success: result.success, documents: result.documents };
            },
          },
          selectEvaluators<RetrieverTaskDatasetExample, RetrieveDocumentationTaskOutput>([
            {
              name: 'NonEmptyDocuments',
              kind: 'CODE' as const,
              evaluate: async ({ output, metadata }) => {
                const minDocs = typeof metadata?.minDocs === 'number' ? metadata.minDocs : 1;
                const count = output?.documents?.length ?? 0;
                return { score: count >= minDocs ? 1 : 0, metadata: { minDocs, count } };
              },
            },
            {
              name: 'RequiredTermsInRetrievedContent',
              kind: 'CODE' as const,
              evaluate: async ({ output, metadata }) => {
                const requiredTerms =
                  Array.isArray(metadata?.requiredTerms) &&
                  metadata.requiredTerms.every((t) => typeof t === 'string')
                    ? metadata.requiredTerms
                    : [];
                if (requiredTerms.length === 0) return { score: 1 };

                const text = (output?.documents ?? [])
                  .slice(0, 3)
                  .map((d) => `${d.title}\n${d.url}\n${d.content}`)
                  .join('\n');

                const ok = containsAllTerms(text, requiredTerms);
                return {
                  score: ok ? 1 : 0,
                  metadata: { requiredTerms, textPreview: text.slice(0, 500) },
                };
              },
            },
            {
              name: 'HasElasticDocsUrl',
              kind: 'CODE' as const,
              evaluate: async ({ output }) => {
                const urls = (output?.documents ?? []).map((d) => d.url);
                const ok = urls.some((u) => typeof u === 'string' && u.startsWith('https://'));
                return { score: ok ? 1 : 0, metadata: { urlsPreview: urls.slice(0, 3) } };
              },
            },
          ])
        );
      }
    );
  }
);
