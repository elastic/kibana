/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { ContentPackStream } from '@kbn/content-packs-schema';
import { StreamTree, mergeTrees } from './tree';

export function prepareStreamsForImport({
  existing,
  incoming,
}: {
  existing: StreamTree;
  incoming: StreamTree;
}): ContentPackStream[] {
  const queue = [mergeTrees({ existing, incoming })];
  const streams: ContentPackStream[] = [];
  while (queue.length > 0) {
    const stream = queue.shift()!;
    streams.push(omit(stream, 'children'));
    queue.push(...stream.children);
  }
  return streams;
}
