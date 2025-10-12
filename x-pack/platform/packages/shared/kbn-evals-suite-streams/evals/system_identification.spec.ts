/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Path from 'path';
import { node } from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { identifySystems } from '@kbn/streams-ai';
import kbnDatemath from '@kbn/datemath';
import type { ScoutTestConfig } from '@kbn/scout';
import { uniq } from 'lodash';
import { describeDataset, formatDocumentAnalysis } from '@kbn/ai-tools';
import { conditionToQueryDsl } from '@kbn/streamlang';
import type { WiredIngest } from '@kbn/streams-schema';
import { evaluate } from '../src/evaluate';
import type { StreamsEvaluationWorkerFixtures } from '../src/types';
import type { SystemEvaluationDataset } from './system_identification_datasets';
import { SYSTEM_IDENTIFICATION_DATASETS } from './system_identification_datasets';

evaluate.describe.configure({ timeout: 600_000 });

const REASONING_POWER =
  process.env.REASONING_POWER === 'high'
    ? 'high'
    : process.env.REASONING_POWER === 'low'
    ? 'low'
    : 'medium';

evaluate.describe('Streams system identification', { tag: '@svlOblt' }, () => {
  const from = kbnDatemath.parse('now-15m')!;
  const to = kbnDatemath.parse('now')!;

  function getSharedArgs({ config }: { config: ScoutTestConfig }) {
    const esUrl = new URL(config.hosts.elasticsearch);
    const kbnUrl = new URL(config.hosts.kibana);

    esUrl.username = config.auth.username;
    esUrl.password = config.auth.password;

    kbnUrl.username = config.auth.username;
    kbnUrl.password = config.auth.password;

    return [
      `--from=${from.toISOString()}`,
      `--to=${to.toISOString()}`,
      `--kibana=${kbnUrl.toString()}`,
      `--target=${esUrl.toString()}`,
      '--assume-package-version=9.2.0',
      '--workers=1',
    ];
  }

  const synthtraceScript = Path.join(REPO_ROOT, 'scripts/synthtrace.js');

  // Index serverless logs with optional system filters derived from dataset examples.
  async function indexServerlessLogs({
    config,
    systems,
  }: {
    config: ScoutTestConfig;
    systems: string[];
  }) {
    const systemArg = `--scenarioOpts.systems="${systems.join(',')}"`;

    await node(require.resolve(synthtraceScript), [
      'serverless_logs',
      ...getSharedArgs({ config }),
      systemArg,
      `--scenarioOpts.rpm=1000`,
    ]);
  }

  async function indexSampleLogs({
    config,
    systems,
  }: {
    config: ScoutTestConfig;
    systems: string[];
  }) {
    await node(require.resolve(synthtraceScript), [
      'sample_logs',
      ...getSharedArgs({ config }),
      `--scenarioOpts.systems="${systems.join(',')}"`,
      '--scenarioOpts.rpm=1000',
    ]);
  }

  async function runSystemIdentificationExperiment(
    dataset: SystemEvaluationDataset,
    {
      phoenixClient,
      apiServices,
      esClient,
      inferenceClient,
      logger,
      evaluators,
      config,
    }: Pick<
      StreamsEvaluationWorkerFixtures,
      | 'phoenixClient'
      | 'apiServices'
      | 'esClient'
      | 'inferenceClient'
      | 'logger'
      | 'evaluators'
      | 'config'
    >
  ) {
    await phoenixClient.runExperiment(
      {
        dataset,
        metadata: {
          reasoning_power: REASONING_POWER,
        },
        task: async ({ input, metadata, output }) => {
          const { stream } = await apiServices.streams.getStreamDefinition(input.stream.name);

          await apiServices.streams.updateStream(stream.name, {
            ingest: {
              ...stream.ingest,
              wired: {
                ...(stream.ingest as WiredIngest).wired,
                fields: {
                  'attributes.filepath': { type: 'keyword' },
                  'attributes.log.file.path': { type: 'keyword' },
                  'attributes.log.logger': { type: 'keyword' },
                  'attributes.kubernetes.node.uid': { type: 'keyword' },
                  'attributes.kubernetes.node.hostname': { type: 'keyword' },
                  'attributes.kubernetes.node.name': { type: 'keyword' },
                  'attributes.kubernetes.labels.app_kubernetes_io/name': { type: 'keyword' },
                  'attributes.kubernetes.labels.app_kubernetes_io/component': { type: 'keyword' },
                  'attributes.kubernetes.labels.app_kubernetes_io/managed-by': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.k8s_elastic_co/project-id': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.app_kubernetes_io/instance': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.app_kubernetes_io/part-of': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.app': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.k8s_elastic_co/application-id': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.labels.batch_kubernetes_io/job-name': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.namespace_labels.kubernetes_io/metadata_name': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.namespace_labels.common_k8s_elastic_co/type': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.namespace_labels.k8s_elastic_co/availability-zone': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.deployment.name': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.deployment.namespace': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.job.name': {
                    type: 'keyword',
                  },
                  'attributes.kubernetes.container.name': {
                    type: 'keyword',
                  },
                  'attributes.host.hostname': {
                    type: 'keyword',
                  },
                  'attributes.process.name': {
                    type: 'keyword',
                  },
                  'attributes.process.id': {
                    type: 'keyword',
                  },
                  'attributes.component.binary': {
                    type: 'keyword',
                  },
                  'attributes.component.id': {
                    type: 'keyword',
                  },
                  'attributes.component.type': {
                    type: 'keyword',
                  },
                  'attributes.service.type': {
                    type: 'keyword',
                  },
                  'attributes.caller': {
                    type: 'keyword',
                  },
                  'attributes.composed-resource-name': {
                    type: 'keyword',
                  },
                  'attributes.kind': {
                    type: 'keyword',
                  },
                  'attributes.host.name': {
                    type: 'keyword',
                  },
                  'resource.attributes.container.runtime': {
                    type: 'keyword',
                  },
                  'resource.attributes.container.image.name': {
                    type: 'keyword',
                  },
                  'resource.attributes.container.image.id': {
                    type: 'keyword',
                  },
                  'resource.attributes.agent.type': {
                    type: 'keyword',
                  },
                  'resource.attributes.cloud.account.service.name': {
                    type: 'keyword',
                  },
                  'resource.attributes.cloud.account.service.provider': {
                    type: 'keyword',
                  },
                  ...(stream.ingest as WiredIngest).wired.fields,
                },
              },
            },
          });

          if (input.systems.loghub.length) {
            await indexSampleLogs({
              systems: input.systems.loghub,
              config,
            });
          }

          if (input.systems.serverless.length) {
            await indexServerlessLogs({
              systems: input.systems.serverless,
              config,
            });
          }

          const { systems } = await identifySystems({
            start: from.valueOf(),
            end: to.valueOf(),
            esClient,
            inferenceClient,
            logger,
            stream,
            kql: '',
            dropUnmapped: true,
            power: REASONING_POWER,
          });

          const systemsWithAnalysis = await Promise.all(
            systems.map(async (system) => {
              return {
                system,
                analysis: formatDocumentAnalysis(
                  await describeDataset({
                    esClient,
                    start: from.valueOf(),
                    end: to.valueOf(),
                    index: stream.name,
                    filter: conditionToQueryDsl(system.filter),
                  }),
                  {
                    dropEmpty: true,
                    dropUnmapped: true,
                  }
                ),
              };
            })
          );

          await esClient.deleteByQuery({
            index: stream.name,
            query: {
              match_all: {},
            },
          });

          return {
            systems: systems.map(({ name, filter }) => ({
              name,
              filter,
            })),
            analysis: systemsWithAnalysis.map(({ system, analysis }) => {
              return {
                name: system.name,
                analysis,
              };
            }),
          };
        },
      },
      [
        {
          name: 'evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators.criteria(expected.criteria).evaluate({
              input,
              expected,
              output,
              metadata,
              weight: expected.weight,
            });

            return result;
          },
        },
      ]
    );
  }

  // Serverless datasets (one describe per dataset with isolated lifecycle)
  SYSTEM_IDENTIFICATION_DATASETS.serverless.forEach((dataset) => {
    evaluate.describe(dataset.name, () => {
      evaluate.beforeEach(async ({ apiServices }) => {
        await apiServices.streams.enable();
        await apiServices.streams.forkStream('logs', 'logs.serverless', { always: {} });
      });

      evaluate.afterEach(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      evaluate(
        'system identification',
        async ({
          evaluators,
          esClient,
          inferenceClient,
          logger,
          phoenixClient,
          apiServices,
          config,
        }) => {
          await runSystemIdentificationExperiment(dataset, {
            apiServices,
            esClient,
            evaluators,
            inferenceClient,
            logger,
            phoenixClient,
            config,
          });
        }
      );
    });
  });

  // Loghub datasets
  SYSTEM_IDENTIFICATION_DATASETS.loghub.forEach((dataset) => {
    evaluate.describe(dataset.name, () => {
      evaluate.beforeEach(async ({ apiServices }) => {
        await apiServices.streams.enable();

        await apiServices.streams.forkStream('logs', 'logs.loghub', {
          and: [
            {
              field: 'attributes.filepath',
              exists: true,
            },
            {
              not: {
                field: 'attributes.filepath',
                eq: 'Android.log',
              },
            },
          ],
        });
      });

      evaluate.afterEach(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      evaluate(
        'system identification',
        async ({
          evaluators,
          esClient,
          inferenceClient,
          logger,
          phoenixClient,
          apiServices,
          config,
        }) => {
          await runSystemIdentificationExperiment(
            {
              ...dataset,
              examples: dataset.examples.map((example) => {
                return {
                  ...example,
                  input: {
                    ...example.input,
                    systems: {
                      ...example.input.systems,
                      loghub: uniq(example.input.systems.loghub.concat('Android')),
                    },
                  },
                };
              }),
            },
            {
              apiServices,
              esClient,
              evaluators,
              inferenceClient,
              logger,
              phoenixClient,
              config,
            }
          );
        }
      );
    });
  });

  // Mixed datasets
  SYSTEM_IDENTIFICATION_DATASETS.mixed.forEach((dataset) => {
    evaluate.describe(dataset.name, () => {
      evaluate.beforeEach(async ({ apiServices }) => {
        await apiServices.streams.enable();
        await apiServices.streams.forkStream('logs', 'logs.mixed', { always: {} });
      });

      evaluate.afterEach(async ({ apiServices, esClient }) => {
        await apiServices.streams.disable();
        await esClient.indices.deleteDataStream({
          name: 'logs*',
        });
      });

      evaluate(
        'system identification',
        async ({
          evaluators,
          esClient,
          inferenceClient,
          logger,
          phoenixClient,
          apiServices,
          config,
        }) => {
          await runSystemIdentificationExperiment(dataset, {
            apiServices,
            esClient,
            evaluators,
            inferenceClient,
            logger,
            phoenixClient,
            config,
          });
        }
      );
    });
  });
});
