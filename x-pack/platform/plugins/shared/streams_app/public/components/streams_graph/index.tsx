/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { StreamsGraphProps } from './streams_graph';

const Component = dynamic(async () => {
  const { StreamsGraph } = await import('./streams_graph');
  return {
    default: StreamsGraph,
  };
});

function LazyStreamsGraph(props: StreamsGraphProps) {
  return <Component {...props} />;
}

export { LazyStreamsGraph as StreamsGraph };
