/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, orderBy } from 'lodash';
import type { ServerlessSystem } from './types';

export function parseServerlessDataset({ system }: { system: ServerlessSystem }) {
  const withTimestamps = orderBy(
    system.hits.map((hit) => ({
      hit,
      timestamp: new Date(hit['@timestamp'] as string | number).getTime(),
    })),
    ({ timestamp }) => timestamp
  );

  const min = withTimestamps[0].timestamp;
  const max = withTimestamps[withTimestamps.length - 1].timestamp;

  const count = system.hits.length;

  const range = max - min;

  const rpm = count / (range / 1000 / 60);

  return {
    rpm,
    range,
    min,
    max,
    hits: withTimestamps.map(({ hit }) =>
      omit(hit, 'data_stream.dataset', 'data_stream.namespace', 'data_stream.type')
    ),
  };
}
