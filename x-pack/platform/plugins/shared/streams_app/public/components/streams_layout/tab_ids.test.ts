/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { hasClassicOrWiredStreams } from './tab_ids';

type Stream = Pick<Streams.all.Definition, 'name' | 'type'>;

describe('hasClassicOrWiredStreams', () => {
  it.each<[string, Stream[], boolean]>([
    ['no streams', [], false],
    [
      'only the root wired streams',
      [
        { name: 'logs.otel', type: 'wired' },
        { name: 'logs.ecs', type: 'wired' },
      ],
      false,
    ],
    ['a query stream', [{ name: 'logs.otel.errors', type: 'query' }], false],
    ['a classic stream', [{ name: 'logs-nginx-default', type: 'classic' }], true],
    ['a wired child stream', [{ name: 'logs.otel.nginx', type: 'wired' }], true],
  ])('%s', (_, streams, expected) => {
    expect(hasClassicOrWiredStreams(streams)).toBe(expected);
  });
});
