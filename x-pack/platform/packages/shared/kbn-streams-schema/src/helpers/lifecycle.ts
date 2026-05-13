/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '../models/streams';
import type {
  IngestStreamEffectiveLifecycle,
  IngestStreamLifecycleAll,
  WiredIngestStreamEffectiveLifecycle,
} from '../models/ingest/lifecycle';
import { isInheritLifecycle } from '../models/ingest/lifecycle';
import { isDescendantOf, isChildOf, getSegments } from '../shared/hierarchy';

export function findInheritedLifecycle(
  definition: Streams.WiredStream.Definition,
  ancestors: Streams.WiredStream.Definition[]
): WiredIngestStreamEffectiveLifecycle {
  const originDefinition = [...ancestors, definition]
    .sort((a, b) => getSegments(a.name).length - getSegments(b.name).length)
    .findLast(({ ingest }) => !isInheritLifecycle(ingest.lifecycle));

  if (!originDefinition) {
    throw new Error('Unable to find inherited lifecycle');
  }

  if (isInheritLifecycle(originDefinition.ingest.lifecycle)) {
    throw new Error('Wired streams can only inherit DSL or ILM');
  }

  return { ...originDefinition.ingest.lifecycle, from: originDefinition.name };
}

export function findInheritingStreams(
  root: Streams.WiredStream.Definition,
  descendants: Streams.WiredStream.Definition[]
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

export function effectiveToIngestLifecycle(
  effectiveLifecycle: IngestStreamEffectiveLifecycle
): IngestStreamLifecycleAll {
  if ('from' in effectiveLifecycle) {
    const { from, ...lifecycle } = effectiveLifecycle;
    return lifecycle;
  }
  return effectiveLifecycle;
}
