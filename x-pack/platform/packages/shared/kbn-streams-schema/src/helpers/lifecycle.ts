/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredStreamDefinition } from '../models/ingest/base';
import {
  isInheritLifecycle,
  WiredIngestStreamEffectiveLifecycle,
} from '../models/ingest/lifecycle';
import { isDescendantOf, isChildOf, getSegments } from './hierarchy';

export function findInheritedLifecycle(
  definition: WiredStreamDefinition,
  ancestors: WiredStreamDefinition[]
): WiredIngestStreamEffectiveLifecycle {
  const originDefinition = [...ancestors, definition]
    .sort((a, b) => getSegments(a.name).length - getSegments(b.name).length)
    .findLast(({ ingest }) => !isInheritLifecycle(ingest.lifecycle));

  if (!originDefinition) {
    throw new Error('Unable to find inherited lifecycle');
  }

  return { ...originDefinition.ingest.lifecycle, from: originDefinition.name };
}

export function findInheritingStreams(
  root: WiredStreamDefinition,
  descendants: WiredStreamDefinition[]
): string[] {
  const inheriting = [];
  const queue = [root];

  while (queue.length > 0) {
    const definition = queue.shift()!;

    if (
      isDescendantOf(root.name, definition.name) &&
      !isInheritLifecycle(definition.ingest.lifecycle)
    ) {
      // ignore subtrees with a lifecycle override
      continue;
    }

    inheriting.push(definition.name);
    queue.push(...descendants.filter((child) => isChildOf(definition.name, child.name)));
  }

  return inheriting;
}
