/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Flags } from '@kbn/dev-cli-runner';
import { BoundInferenceClient } from '@kbn/inference-common';
import { KibanaClient } from '@kbn/kibana-api-cli';
import { ValidateProcessorsCallback } from '@kbn/streams-ai';
import { SampleSet } from '@kbn/streams-ai';
import { ProcessorValidation } from '@kbn/streams-ai';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { ProcessorDefinitionWithId, Streams } from '@kbn/streams-schema';
import { ToolingLog } from '@kbn/tooling-log';
import { omit, uniqBy } from 'lodash';
import { inspect } from 'util';
import { fromExternalVariant } from '@kbn/std';

type SimulateProcessingResponse =
  APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;

export async function callGenerateProcessors(
  {
    kibanaClient,
    esClient,
    inferenceClient,
    signal,
    flags,
    log,
    logger,
    streamGetResponse,
    start,
    end,
    sampleSet,
  }: {
    kibanaClient: KibanaClient;
    esClient: ElasticsearchClient;
    inferenceClient: BoundInferenceClient;
    signal: AbortSignal;
    flags: Flags;
    log: ToolingLog;
    logger: Logger;
    streamGetResponse: Streams.WiredStream.GetResponse;
    start: number;
    end: number;
    sampleSet: SampleSet;
  },
  cb: (options: {
    definition: Streams.WiredStream.Definition;
    esClient: ElasticsearchClient;
    inferenceClient: BoundInferenceClient;
    start: number;
    end: number;
    logger: Logger;
    signal: AbortSignal;
    validateProcessors: ValidateProcessorsCallback;
    sampleSet: SampleSet;
  }) => Promise<ProcessorDefinitionWithId[]>
) {
  async function simulate({
    samples,
    processor,
  }: {
    samples: SearchHit[];
    processor: ProcessorDefinitionWithId;
  }): Promise<ProcessorValidation & { documents: SearchHit[] }> {
    return await kibanaClient
      .fetch<SimulateProcessingResponse>(`/internal/streams/${flags.stream}/processing/_simulate`, {
        method: 'POST',
        body: {
          processing: [processor],
          documents: samples.map((hit) => hit._source),
        },
      })
      .then((response) => {
        const processorMetric = Object.values(response.processors_metrics)[0];

        const documentsByErrors = new Map(
          response.documents.flatMap((doc) => {
            return doc.errors.map((error) => {
              return [error.message, doc];
            });
          })
        );

        const isExtractProcessor = 'grok' in processor || 'dissect' in processor;
        const { id, ...config } = processor;

        const variant = fromExternalVariant(config);

        const ignoreFailure =
          'ignore_failure' in variant.value ? variant.value.ignore_failure : false;

        const invalid = processorMetric.failed_rate > 0 && !ignoreFailure;

        const errors = uniqBy(
          processorMetric.errors
            .map((error) => {
              const sample = documentsByErrors.get(error.message)?.value ?? null;
              return {
                error,
                sample,
              };
            })
            .filter(({ error }) => {
              return error.type !== 'non_additive_processor_failure';
            })
            .map(({ sample, error }) => {
              if (isExtractProcessor) {
                return {
                  message: error.message,
                  sample: (sample?.message as string | undefined) ?? null,
                };
              }

              return {
                message: error.message,
                sample,
              };
            }),
          ({ message }) => {
            const normalizedErrors = [
              `Provided Grok expressions do not match field value`,
              `Unable to find match for dissect pattern`,
              `could not be parsed, unparsed text found`,
            ];

            const normalized = normalizedErrors.find((error) => message.includes(error));

            return normalized ?? message;
          }
        ).slice(0, 10);

        return {
          validity: {
            valid: errors.length && ignoreFailure ? 'partial' : errors.length ? 'invalid' : 'valid',
          },
          documents: response.documents.map((document) => {
            return {
              _index: String(flags.stream),
              _source: document.value,
            };
          }) as SearchHit[],
          failure_rate: ignoreFailure ? 0 : processorMetric.failed_rate,
          ignored_failure_rate: ignoreFailure ? processorMetric.failed_rate : 0,
          parsed_rate: processorMetric.parsed_rate,
          skipped_rate: processorMetric.skipped_rate,
          successful: response.documents
            .filter((doc) => {
              return doc.status === 'parsed';
            })
            .slice(0, invalid ? 0 : 5)
            .map((doc) => doc.value),
          [ignoreFailure ? 'ignored_errors' : 'erorrs']: errors,
        };
      });
  }

  async function validateProcessors({
    samples,
    processors,
  }: {
    samples: SearchHit[];
    processors: ProcessorDefinitionWithId[];
  }) {
    if (processors.length === 0) {
      return {
        state: {
          validity: 'valid' as const,
        },
        validations: [],
        output: {
          hits: samples,
          total: samples.length,
        },
      };
    }

    log.debug(inspect(processors, { depth: 5 }));

    const validations: Array<{
      processor: ProcessorDefinitionWithId;
      validation: ProcessorValidation & { documents: SearchHit[] };
    }> = [];

    let nextSamples: SearchHit[] = samples;

    for (const processor of processors) {
      const validation = await simulate({ samples: nextSamples, processor });

      log.debug(
        inspect(
          {
            processor,
            validation: omit(validation, 'documents'),
          },
          { depth: null }
        )
      );

      validations.push({
        processor,
        validation,
      });

      nextSamples = validation.documents;
    }

    const valid = validations.every((validation) => validation.validation.failure_rate === 0);

    return {
      state: {
        validity: valid ? 'valid' : 'invalid',
      } as const,
      validations: validations.map(({ processor, validation }) => {
        const { documents, ...rest } = validation;
        return {
          processor,
          validation: rest,
        };
      }),
      output: {
        total: nextSamples.length,
        hits: nextSamples,
      },
    };
  }

  const nextProcessors = await cb({
    definition: streamGetResponse.stream,
    start,
    end,
    esClient,
    inferenceClient,
    logger,
    signal,
    sampleSet,
    validateProcessors: ({ samples, processors }) => {
      return validateProcessors({ samples, processors });
    },
  });

  log.info(JSON.stringify(nextProcessors));

  const { validations, state, output } = await validateProcessors({
    samples: sampleSet.hits,
    processors: nextProcessors,
  });

  if (state.validity === 'invalid') {
    log.error(inspect(validations, { depth: null }));
    throw new Error(`Errors encountered during validation`);
  }

  const processorsToAdd = nextProcessors.map((processor) => {
    const { id, ...config } = processor;
    return config;
  });

  if (flags.apply) {
    await kibanaClient.fetch(`/api/streams/${flags.stream}`, {
      method: 'PUT',
      body: {
        dashboards: streamGetResponse.dashboards,
        queries: streamGetResponse.queries,
        stream: {
          ...omit(streamGetResponse.stream, 'name'),
          ingest: {
            ...streamGetResponse.stream.ingest,
            processing: [...streamGetResponse.stream.ingest.processing, ...processorsToAdd],
          },
        },
      } satisfies Streams.WiredStream.UpsertRequest,
    });
    log.info(`Applied parsing rules`);
  }

  return {
    processors: processorsToAdd ?? [],
    output,
  };
}
