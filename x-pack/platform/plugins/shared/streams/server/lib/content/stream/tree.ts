/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq } from 'lodash';
import { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { filterQueries, filterRouting, includedObjectsFor } from './helpers';

export type StreamTree = ContentPackStream & {
  children: StreamTree[];
};

export function asTree({
  root,
  streams,
  include,
}: {
  root: string;
  streams: ContentPackStream[];
  include: ContentPackIncludedObjects;
}): StreamTree {
  const stream = streams.find(({ name }) => name === root);
  if (!stream) {
    throw new Error(`Could not find stream [${root}]`);
  }

  const routing = filterRouting(stream, include);
  return {
    ...stream,
    request: {
      ...stream.request,
      queries: filterQueries(stream, include),
      stream: {
        ...stream.request.stream,
        ingest: {
          ...stream.request.stream.ingest,
          wired: {
            ...stream.request.stream.ingest.wired,
            routing,
          },
        },
      },
    },
    children: routing.map(({ destination }) =>
      asTree({
        streams,
        root: destination,
        include: includedObjectsFor(destination, include),
      })
    ),
  };
}

export function mergeTrees({
  base,
  existing,
  incoming,
}: {
  base: StreamTree | undefined;
  existing: StreamTree;
  incoming: StreamTree;
}) {
  const merged: StreamTree = {
    name: existing.name,
    type: 'stream',
    children: [],
    request: {
      stream: {
        description: existing.request.stream.description,
        ingest: {
          processing: existing.request.stream.ingest.processing,
          lifecycle: existing.request.stream.ingest.lifecycle,
          wired: {
            routing: [],
            fields: {},
          },
        },
      },
      queries: [],
      dashboards: [],
    },
  };

  merged.request.stream.ingest.wired.fields = uniq([
    ...Object.keys(base?.request.stream.ingest.wired.fields ?? {}),
    ...Object.keys(existing.request.stream.ingest.wired.fields),
    ...Object.keys(incoming.request.stream.ingest.wired.fields),
  ]).reduce((fields, key) => {
    if (
      !isEqual(
        existing.request.stream.ingest.wired.fields[key],
        base?.request.stream.ingest.wired.fields[key]
      )
    ) {
      fields[key] = existing.request.stream.ingest.wired.fields[key];
    } else {
      fields[key] = incoming.request.stream.ingest.wired.fields[key];
    }

    return fields;
  }, {} as FieldDefinition);

  merged.request.queries = mergeQueries({
    base: base?.request.queries,
    existing: existing.request.queries,
    incoming: incoming.request.queries,
  });

  const [mergedChildren, mergedRouting] = uniq([
    ...(base?.children.map(({ name }) => name) ?? []),
    ...existing.children.map(({ name }) => name),
    ...incoming.children.map(({ name }) => name),
    ,
  ]).reduce(
    ([children, routing], name) => {
      const baseChild = base?.children.find((child) => child.name === name);
      const existingChild = existing.children.find((child) => child.name === name);
      const incomingChild = incoming.children.find((child) => child.name === name);

      if (existingChild && incomingChild) {
        const { merged: mergedChild } = mergeTrees({
          base: baseChild,
          existing: existingChild,
          incoming: incomingChild,
        });
        children.push(mergedChild);

        const baseRouting = base?.request.stream.ingest.wired.routing.find(
          ({ destination }) => destination === name
        );
        const existingRouting = existing.request.stream.ingest.wired.routing.find(
          ({ destination }) => destination === name
        );
        const incomingRouting = incoming.request.stream.ingest.wired.routing.find(
          ({ destination }) => destination === name
        );
        if (existingRouting && (!baseRouting || !isEqual(existingRouting, baseRouting))) {
          routing.push(existingRouting);
        } else {
          if (incomingRouting) {
            routing.push(incomingRouting);
          } else if (existingRouting) {
            routing.push(existingRouting);
          }
        }

        return [children, routing];
      }

      if (existingChild && !baseChild && !incomingChild) {
        children.push(existingChild);
        routing.push(
          existing.request.stream.ingest.wired.routing.find(
            ({ destination }) => destination === name
          )!
        );

        return [children, routing];
      }

      if (!baseChild && incomingChild) {
        children.push(incomingChild);
        routing.push(
          incoming.request.stream.ingest.wired.routing.find(
            ({ destination }) => destination === name
          )!
        );

        return [children, routing];
      }

      return [children, routing];
    },
    [[], []] as [StreamTree[], RoutingDefinition[]]
  );

  merged.children = mergedChildren;
  merged.request.stream.ingest.wired.routing = mergedRouting;

  return { existing: existing, merged };
}

function mergeQueries({
  base = [],
  existing,
  incoming,
}: {
  base?: StreamQuery[];
  existing: StreamQuery[];
  incoming: StreamQuery[];
}): StreamQuery[] {
  return uniq([
    ...(base.map((query) => query.id) ?? []),
    ...existing.map((query) => query.id),
    ...incoming.map((query) => query.id),
  ]).reduce((queries, id) => {
    const baseQuery = base.find((q) => q.id === id);
    const existingQuery = existing.find((q) => q.id === id);
    const incomingQuery = incoming.find((q) => q.id === id);

    if (!existingQuery) {
      if (!baseQuery && incomingQuery) {
        queries.push(incomingQuery);
      }
    } else if (incomingQuery) {
      if (!isEqual(baseQuery, existingQuery) && !isEqual(existingQuery, incomingQuery)) {
        // conflict - existing query was modified by user
        queries.push(existingQuery);
        return queries;
      }

      queries.push(incomingQuery);
    } else {
      queries.push(existingQuery);
    }

    return queries;
  }, [] as StreamQuery[]);
}
