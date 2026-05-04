/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashString, noisyRate, seededHealth, seededRandom } from '../shared/seeded_noise';
import type {
  OtlpEdgeThroughput,
  OtlpEndpointConfig,
  OtlpEndpointHealth,
  OtlpEndpointThroughput,
  PipelineMetricsResult,
} from './types';

export const generatePipelineMetrics = (
  pipelines: OtlpEndpointConfig[],
  now: number,
  availableStreamNames: string[]
): PipelineMetricsResult => {
  const bucketTime = Math.floor(now / 5000);

  const perPipeline: Record<string, OtlpEndpointThroughput> = {};
  const perEdge: Record<string, OtlpEdgeThroughput> = {};
  const health: Record<string, OtlpEndpointHealth> = {};

  for (const pipeline of pipelines) {
    const { id } = pipeline;

    // Base rate: 200–2200 docs/sec range
    const baseRate = seededRandom(hashString(id)) * 2000 + 200;
    const docsPerSec = noisyRate(baseRate, id, bucketTime);
    const bytesPerSec = docsPerSec * (500 + seededRandom(hashString(`${id}:bytes`)) * 300);

    const status = seededHealth(id, bucketTime);

    perPipeline[id] = { id, docsPerSec, bytesPerSec };
    health[id] = { id, status };

    // Edge distribution
    if (pipeline.targetStreamName) {
      const edgeKey = `${id}->${pipeline.targetStreamName}`;
      perEdge[edgeKey] = {
        endpointId: id,
        streamName: pipeline.targetStreamName,
        docsPerSec,
      };
    } else if (availableStreamNames.length > 0) {
      // Distribute evenly across first 2 available streams
      const targets = availableStreamNames.slice(0, 2);
      const docsPerStream = docsPerSec / targets.length;
      for (const streamName of targets) {
        const edgeKey = `${id}->${streamName}`;
        perEdge[edgeKey] = {
          endpointId: id,
          streamName,
          docsPerSec: docsPerStream,
        };
      }
    }
  }

  return { perPipeline, perEdge, health };
};
