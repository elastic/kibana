/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { toInteger } from 'lodash';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { ESProcessorItem } from '../../common';
import { createPassthroughFailureProcessor, createRemoveProcessor } from './processors';

export interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
    [key: string]: unknown;
  };
}

function formatSample(sample: string): DocTemplate {
  const docsTemplate: DocTemplate = {
    _index: 'index',
    _id: 'id',
    _source: { message: '' },
  };
  const formatted: DocTemplate = { ...docsTemplate };
  formatted._source.message = sample;
  return formatted;
}

export async function testPipeline(
  samples: string[],
  pipeline: object,
  client: IScopedClusterClient
): Promise<{ pipelineResults: Array<{ [key: string]: unknown }>; errors: object[] }> {
  const docs = samples.map((sample) => formatSample(sample));
  const pipelineResults: Array<{ [key: string]: unknown }> = [];
  const errors: object[] = [];

  try {
    const output = await client.asCurrentUser.ingest.simulate({ docs, pipeline });
    for (const doc of output.docs) {
      if (!doc) {
        // Nothing to do – the document was dropped.
      } else if (doc.doc?._source?.error) {
        errors.push(doc.doc._source.error);
      } else if (doc.doc?._source) {
        pipelineResults.push(doc.doc._source);
      }
    }
  } catch (e) {
    errors.push({ error: (e as Error).message });
  }

  return { pipelineResults, errors };
}

export async function createJSONInput(
  processors: ESProcessorItem[],
  samples: string[],
  client: IScopedClusterClient
): Promise<{ pipelineResults: Array<{ [key: string]: unknown }>; errors: object[] }> {
  const pipeline = {
    processors: [...processors, createRemoveProcessor()],
    on_failure: [createPassthroughFailureProcessor()],
  };
  const { pipelineResults, errors } = await testPipeline(samples, pipeline, client);
  return { pipelineResults, errors };
}

/**
 * Ensures that the given processors successfully compile.
 *
 * This works by simulating the pipeline in Elasticsearch and removes any processors that produce compile errors.
 * In case we are unable to determine the failing processor, we recursively split the processors in half and try again.
 *
 * @param pipeline - The pipeline definition to simulate and validate.
 * @param client - An Elasticsearch client scoped to the current user for pipeline simulation.
 * @returns A promise resolving to the final pipeline definition after removing any failing processors.
 */
export async function ensureProcessorsCompile(
  processors: ESProcessorItem[],
  client: IScopedClusterClient
): Promise<ESProcessorItem[]> {
  const currentProcessors = [...processors];

  while (currentProcessors.length > 0) {
    const docs = [{ _source: { message: '' } }];
    const pipeline = {
      description: 'Pipeline for testing processor compilation',
      processors: currentProcessors.map((p, index) => {
        const key = Object.keys(p)[0];
        return { [key]: { ...p[key], tag: `processor-${index}` } };
      }),
    };

    try {
      await client.asCurrentUser.ingest.simulate({ docs, pipeline });
      break;
    } catch (error) {
      const tag = error.meta?.body?.error?.processor_tag;
      if (tag) {
        const index = toInteger(tag.split('-')[1]);
        currentProcessors.splice(index, 1);
      } else if (currentProcessors.length === 1) {
        // There is only one processor left, and it is failing.
        return [];
      } else {
        // Unable to determine the failing processor using the tag, we have to be creative.
        const half = Math.ceil(currentProcessors.length / 2);
        const ensureFirstHalf = await ensureProcessorsCompile(
          currentProcessors.slice(0, half),
          client
        );
        const ensureSecondHalf = await ensureProcessorsCompile(
          currentProcessors.slice(half),
          client
        );
        return [...ensureFirstHalf, ...ensureSecondHalf];
      }
    }
  }

  return currentProcessors;
}
