/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { truncateList } from '@kbn/inference-common';
import type { KibanaClient } from '@kbn/kibana-api-cli';
import type { PatternMatchFailure } from '@kbn/streams-ai';
import {
  findDissectMatchFailure,
  findGrokMatchFailure,
  formatMatchFailure,
  initializeOnboarding,
} from '@kbn/streams-ai';
import type { FlattenRecord } from '@kbn/streams-schema';
import { Streams, getProcessorConfig } from '@kbn/streams-schema';
import { castArray, get, omit, pick, uniqBy } from 'lodash';
import type { SampleError } from '@kbn/streams-ai/shared/processing/types';
import type {
  OnboardingTaskContext,
  OnboardingTaskState,
} from '@kbn/streams-ai/workflows/onboarding/types';
import {
  isDissectProcessorDefinition,
  isGrokProcessorDefinition,
} from '@kbn/streams-schema/src/models/ingest/processors';
import { createStreamsRepositoryCliClient } from './create_repository_client';

const GROK_NO_MATCH_ERROR = `Provided Grok expressions do not match field value`;
const DISSECT_NO_MATCH_ERROR = `Unable to find match for dissect pattern`;

export async function initializeCliOnboarding({
  name,
  esClient,
  inferenceClient,
  kibanaClient,
  start,
  end,
  logger,
  signal,
}: {
  name: string;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  kibanaClient: KibanaClient;
  start: number;
  end: number;
  logger: Logger;
  signal: AbortSignal;
}): Promise<{
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
  apply: (state: OnboardingTaskState) => Promise<void>;
}> {
  const streamsRepositoryClient = createStreamsRepositoryCliClient(kibanaClient);

  const { context, state } = await initializeOnboarding({
    name,
    start,
    end,
    esClient,
    inferenceClient,
    logger,
    signal,
    services: {
      streams: {
        forkStream: (streamName, body) => {
          return streamsRepositoryClient.fetch('POST /api/streams/{name}/_fork 2023-10-31', {
            signal,
            params: {
              path: { name: streamName },
              body,
            },
          });
        },
        getStream: async (streamName) => {
          return Streams.WiredStream.GetResponse.parse(
            await streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
              signal,
              params: {
                path: { name: streamName },
              },
            })
          );
        },
        updateStream: (streamName, body) => {
          return streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
            signal,
            params: {
              path: { name: streamName },
              body,
            },
          });
        },
      },
      processing: {
        simulate: async (streamName, { processor, samples }) => {
          const simulationResponse = await streamsRepositoryClient.fetch(
            'POST /internal/streams/{name}/processing/_simulate',
            {
              signal,
              params: {
                path: {
                  name: streamName,
                },
                body: {
                  documents: samples.map((sample) => sample._source) as unknown as FlattenRecord[],
                  processing: [processor],
                },
              },
            }
          );

          const documentsByErrors = new Map(
            simulationResponse.documents.flatMap((doc) => {
              return doc.errors.map((error) => {
                return [error.message, doc];
              });
            })
          );

          const metrics = simulationResponse.processors_metrics[processor.id];

          const processorConfig = getProcessorConfig(processor);

          const ignoreFailure = processorConfig.ignore_failure ?? false;

          const isExtractProcessor = 'grok' in processor || 'dissect' in processor;

          const nonAdditiveFailure = metrics.errors.find(
            (error) => error.type === 'non_additive_processor_failure'
          );

          const errors: SampleError[] = uniqBy(
            metrics.errors
              .map((error) => {
                const sample = documentsByErrors.get(error.message)?.value ?? undefined;
                return {
                  error,
                  sample,
                };
              })
              .map(({ sample, error }) => {
                if (isExtractProcessor) {
                  return {
                    error: {
                      message: error.message,
                    },
                    source: pick(sample, processorConfig.field),
                  };
                }

                return {
                  error: {
                    message: error.message,
                  },
                  source: sample,
                };
              }),
            ({ error }) => {
              const normalizedErrors = [
                GROK_NO_MATCH_ERROR,
                DISSECT_NO_MATCH_ERROR,
                `could not be parsed, unparsed text found`,
              ];

              const normalized = normalizedErrors.find((msg) => error.message.includes(msg));

              return normalized ?? error.message;
            }
          ).slice(0, 10);

          const documents = simulationResponse.documents.map((doc) => {
            return {
              _source: doc.value,
              _index: streamName,
            };
          });

          const displayedFailureRate = nonAdditiveFailure
            ? 1
            : ignoreFailure
            ? 0
            : metrics.failed_rate;

          const displayedSuccessRate = displayedFailureRate === 1 ? 0 : metrics.parsed_rate;

          const validity =
            nonAdditiveFailure || displayedFailureRate > 0
              ? 'failure'
              : metrics.parsed_rate === 1
              ? 'success'
              : 'partial';

          const addedFields = new Map(
            metrics.detected_fields.map((field) => [field, new Set<string | number | boolean>()])
          );

          documents.forEach((document) => {
            Array.from(metrics.detected_fields).forEach((field) => {
              const value = get(document._source, field);
              if (value) {
                castArray(value).forEach((val) => {
                  if (val) {
                    addedFields.get(field)?.add(val);
                  }
                });
              }
            });
          });

          const addedFieldsWithValues = Object.fromEntries(
            Array.from(addedFields).map(([field, values]) => {
              return [field, truncateList(Array.from(values), 5)];
            })
          );

          const messageField = processorConfig.field;

          const successfulDocuments = simulationResponse.documents
            .filter((doc) => doc.status === 'parsed')
            .slice(0, 5);

          const successful =
            validity !== 'failure'
              ? successfulDocuments.map((doc) => doc.value).slice(0, 1)
              : isExtractProcessor
              ? successfulDocuments.map((doc) => pick(doc.value, messageField)).slice(0, 1)
              : [];

          return {
            processor,
            output: documents,
            result: {
              failure_rate: displayedFailureRate,
              ignored_failure_rate: ignoreFailure ? metrics.failed_rate : 0,
              success_rate: displayedSuccessRate,
              ...(successful.length
                ? {
                    successful,
                  }
                : {}),
              [ignoreFailure ? 'ignored_errors' : 'errors']: errors.map(({ error, source }) => {
                if (!source) {
                  return { error };
                }

                const message = Object.values(source)[0] as string;

                let failure: PatternMatchFailure | null = null;

                const { id, ...config } = processor;

                if (
                  isDissectProcessorDefinition(config) &&
                  error.message.includes(DISSECT_NO_MATCH_ERROR)
                ) {
                  failure = findDissectMatchFailure(config.dissect.pattern, message);
                } else if (
                  isGrokProcessorDefinition(config) &&
                  error.message.includes(GROK_NO_MATCH_ERROR)
                ) {
                  failure =
                    config.grok.patterns.flatMap((pattern) => {
                      const failureForCurrentPattern = findGrokMatchFailure(
                        pattern,
                        message,
                        config.grok.pattern_definitions ?? {}
                      );
                      return failureForCurrentPattern ? [failureForCurrentPattern] : [];
                    })[0] ?? null;
                }

                if (failure) {
                  return {
                    error: formatMatchFailure(failure),
                    source,
                  };
                }
                return { error };
              }),
              ...(validity !== 'failure' ? { added_fields: addedFieldsWithValues } : {}),
              ...(nonAdditiveFailure ? { non_additive_failure: nonAdditiveFailure.message } : {}),
            },
            validity,
          };
        },
      },
    },
  });
  return {
    context,
    state,
    apply: async (next) => {
      await context.services.streams.updateStream(next.stream.definition.name, {
        dashboards: next.stream.dashboards,
        queries: next.stream.queries,
        stream: omit(next.stream.definition, 'name'),
      });
    },
  };
}
