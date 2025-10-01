/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifySystems } from '@kbn/streams-ai';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams, System } from '@kbn/streams-schema';

export function runSystemIdentification({
  start,
  end,
  esClient,
  inferenceClient,
  logger,
  stream,
  systems,
}: {
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  stream: Streams.all.Definition;
  systems: System[];
}) {
  return identifySystems({
    start,
    end,
    esClient,
    inferenceClient,
    logger,
    stream,
    systems,
  });
}
