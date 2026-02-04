/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

const durationMatcher = /^(?<value>\d+)(?<unit>ms|s|m|h|d)$/;

export const parseDurationToMs = (duration: string): number => {
  const match = durationMatcher.exec(duration);
  if (!match || !match.groups) {
    throw new Error(`Invalid duration "${duration}". Expected format like 10m or 1h.`);
  }

  const value = Number(match.groups.value);
  const unit = match.groups.unit;

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid duration "${duration}". Value must be > 0.`);
  }

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit "${unit}".`);
  }
};

export const normalizeTaskInterval = (duration: string): string => {
  const ms = parseDurationToMs(duration);
  const seconds = Math.round(ms / 1000);
  if (seconds <= 59 && seconds >= 1) {
    return `${seconds}s`;
  }

  const minutes = Math.max(1, Math.round(ms / (60 * 1000)));
  return `${minutes}m`;
};

export const pickEmbeddingInferenceId = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<string> => {
  const { endpoints } = await esClient.inference.get({ inference_id: '_all' });
  const embeddingEndpoints = endpoints.filter((endpoint) =>
    ['text_embedding', 'sparse_embedding'].includes(endpoint.task_type)
  );

  if (embeddingEndpoints.length === 0) {
    throw new Error('No embedding inference endpoints available for semantic_text fields.');
  }

  const inferenceId = embeddingEndpoints[0].inference_id;
  logger.debug(`Using inference endpoint "${inferenceId}" for SML semantic_text mappings.`);
  return inferenceId;
};
