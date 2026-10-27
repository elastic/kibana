/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartEngine } from '@kbn/isomer-primitives-charts';

import {
  defineElasticChartsEngine,
  type ElasticChartsEngineOptions,
} from '@kbn/isomer-charts-elastic';
import { createStaticDraw, type NodeDrawOptions } from './node_draw';

/**
 * {@link defineElasticChartsEngine} with a static `draw` in the calling thread: no worker, so no second isolate
 * and no copy of each drawing. It installs a jsdom window as this thread's globals, and each draw blocks the
 * thread, so it belongs only in a process that does nothing but draw, such as a render process.
 */
export const defineElasticChartsInlineEngine = async ({
  fonts,
  pixelRatio,
  ...options
}: ElasticChartsEngineOptions & NodeDrawOptions = {}): Promise<ChartEngine> => {
  const draw = await createStaticDraw({
    ...options,
    ...(fonts === undefined ? {} : { fonts }),
    ...(pixelRatio === undefined ? {} : { pixelRatio }),
  });
  return {
    ...defineElasticChartsEngine(options),
    draw: async (node, request) => draw(node, request),
  };
};
