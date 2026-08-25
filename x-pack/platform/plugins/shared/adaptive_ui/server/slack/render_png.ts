/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@kbn/adaptive-ui';
import { renderPNG } from '@kbn/adaptive-ui/node';

/**
 * Rasterizes one chart node for Slack, which has no native chart block.
 *
 * `@kbn/adaptive-ui/node` pulls in `satori` and native `@resvg/resvg-js`, so
 * import this module lazily — a Kibana that never posts a chart to Slack should
 * never load the rasterizer. Height is estimated from the content; the pack
 * always draws its view chrome around the node.
 */
export const renderNodePng = async (node: PrimitiveNode): Promise<Buffer> => {
  const { png } = await renderPNG({ type: 'view', body: [node] });
  return png;
};
