/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import { omit, uniqBy } from 'lodash';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { SimulationResponse } from '@kbn/streams-schema';
import type { ProcessingService, ProcessorValidationResult } from './types';

function handleSimulateResponse({
  stream,
  response,
  processor,
}: {
  stream: { name: string };
  response: SimulationResponse;
  processor: StreamlangProcessorDefinition & { id: string };
}): ProcessorValidationResult {
  const processorMetric = Object.values(response.processors_metrics)[0];

  const documentsByErrors = new Map(
    response.documents.flatMap((doc) => {
      return doc.errors.map((error) => {
        return [error.message, doc];
      });
    })
  );

  const isExtractProcessor = processor.action === 'grok' || processor.action === 'dissect';

  const ignoreFailure = processor.ignore_failure;

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
    processor,
    result: {
      validity: (errors.length && ignoreFailure
        ? 'partial'
        : errors.length
        ? 'failure'
        : 'success') as 'partial' | 'success' | 'failure',
      failure_rate: ignoreFailure ? 0 : processorMetric.failed_rate,
      ignored_failure_rate: ignoreFailure ? processorMetric.failed_rate : 0,
      success_rate: processorMetric.parsed_rate,
      successful: response.documents
        .filter((doc) => {
          return doc.status === 'parsed';
        })
        .slice(0, invalid ? 0 : 5)
        .map((doc) => doc.value),
      [ignoreFailure ? 'ignored_errors' : 'errors']: errors,
    },
    output: response.documents.map((document) => {
      return {
        _index: stream.name,
        _source: document.value,
      };
    }) as SearchHit[],
  };
}

export async function simulatePipeline(
  name: string,
  {
    samples,
    service,
    processors,
  }: {
    samples: SearchHit[];
    service: ProcessingService;
    processors: Array<StreamlangProcessorDefinition & { id: string }>;
  }
) {
  let nextSamples = samples;

  const results: ProcessorValidationResult[] = [];

  for (const processor of processors) {
    const simulateResponse = handleSimulateResponse({
      stream: {
        name,
      },
      processor,
      response: await service.simulate(name, {
        processor: omit(processor, 'id') as StreamlangProcessorDefinition,
        samples: nextSamples,
      }),
    });

    nextSamples = simulateResponse.output;

    results.push(simulateResponse);
  }

  return {
    results,
    output: nextSamples,
  };
}
