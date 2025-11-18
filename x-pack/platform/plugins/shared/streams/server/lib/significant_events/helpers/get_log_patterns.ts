/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLogPatterns as kbnGetLogPatterns } from '@kbn/ai-tools';
import { type Streams, getIndexPatternsForStream } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { Logger } from '@kbn/core/server';

interface Params {
  categorizationField: string | undefined;
  lookbackStart: number;
  end: number;
  definition: Streams.all.Definition;
}

interface Dependencies {
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export async function getLogPatterns(params: Params, dependencies: Dependencies) {
  const { esClient, logger } = dependencies;
  const { categorizationField, lookbackStart, end, definition } = params;
  if (!categorizationField) {
    logger.debug('No categorization field found, skipping log pattern analysis');
    return undefined;
  }

  const logPatterns = await kbnGetLogPatterns({
    start: lookbackStart,
    end,
    esClient,
    fields: [categorizationField],
    index: getIndexPatternsForStream(definition),
    includeChanges: true,
    metadata: [],
  }).then((results) => {
    return results.map((result) => {
      const { sample, count, regex } = result;
      return { count, sample, regex };
    });
  });

  if (logPatterns?.length) {
    logger.debug(() => {
      return `Found ${logPatterns?.length} log patterns: ${logPatterns
        .map((pattern) => `- ${pattern.sample} (${pattern.count})`)
        .join('\n')}
      `;
    });
  }

  return logPatterns;
}
