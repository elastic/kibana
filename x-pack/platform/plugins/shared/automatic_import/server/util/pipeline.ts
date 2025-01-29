/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { ESProcessorItem } from '../../common';
import { createPassthroughFailureProcessor, createRemoveProcessor } from './processors';

interface DocTemplate {
  _index: string;
  _id: string;
  _source: {
    message: string;
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
