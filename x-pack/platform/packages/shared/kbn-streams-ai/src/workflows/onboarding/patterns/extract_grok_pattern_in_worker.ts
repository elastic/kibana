/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Piscina from 'piscina';
import { get } from 'lodash';
import type { GrokPatternNode } from '@kbn/grok-heuristics/src/types';
import type { DocumentAnalysis } from '@kbn/ai-tools';

const workerPool = new Piscina({
  maxThreads: 1,
  filename: require.resolve('./extract_grok_pattern_worker'),
});

export async function extractGrokPatternInWorker({
  analysis,
  messageField,
}: {
  analysis: DocumentAnalysis;
  messageField: string;
}) {
  const { samples } = analysis;

  const messages = samples
    .map((sample) => {
      const message = sample.fields?.[messageField] || get(sample._source, messageField);
      return message as string | string[];
    })
    .flat()
    .filter(Boolean);

  const controller = new AbortController();
  const workerPromise = workerPool.run(
    {
      messages,
    },
    {
      signal: controller.signal,
    }
  );

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  const grokNode = (await workerPromise) as GrokPatternNode[];

  clearTimeout(timeoutId);

  return grokNode;
}
