/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import {
  ContentPackIncludedObjects,
  ContentPackStream,
  PropertyConflict,
  StreamConflict,
} from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import {
  ConflictResolverFactories,
  IdResolverFactory,
  filterQueries,
  filterRouting,
  includedObjectsFor,
} from './helpers';
import { mergeField, mergeQuery, mergeRoutingDefinition } from './merge';

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
  resolverFactories,
}: {
  base: StreamTree | undefined;
  existing: StreamTree;
  incoming: StreamTree;
  resolverFactories: ConflictResolverFactories;
}): {
  existing: StreamTree;
  incoming: StreamTree;
  merged: StreamTree;
  conflicts: StreamConflict[];
} {
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

  const { merged: mergedFields, conflicts: fieldConflicts } = mergeFields({
    base: base?.request.stream.ingest.wired.fields,
    existing: existing.request.stream.ingest.wired.fields,
    incoming: incoming.request.stream.ingest.wired.fields,
    resolverFactory: resolverFactories.field(existing.name),
  });
  merged.request.stream.ingest.wired.fields = mergedFields;

  const { merged: mergedQueries, conflicts: queryConflicts } = mergeQueries({
    base: base?.request.queries,
    existing: existing.request.queries,
    incoming: incoming.request.queries,
    resolverFactory: resolverFactories.query(existing.name),
  });
  merged.request.queries = mergedQueries;

  const { merged: mergedRouting, conflicts: routingConflicts } = mergeRouting({
    base: base?.request.stream.ingest.wired.routing,
    existing: existing.request.stream.ingest.wired.routing,
    incoming: incoming.request.stream.ingest.wired.routing,
    resolverFactory: resolverFactories.routing(existing.name),
  });
  merged.request.stream.ingest.wired.routing = mergedRouting;

  const { children: mergedChildren, conflicts: childConflicts } = mergeChildren({
    base: base,
    existing: existing,
    incoming: incoming,
    resolverFactories,
    routing: mergedRouting,
  });
  merged.children = mergedChildren;

  return {
    existing,
    incoming,
    merged,
    conflicts: [
      { name: merged.name, conflicts: [...fieldConflicts, ...queryConflicts, ...routingConflicts] },
      ...childConflicts,
    ].filter(({ conflicts }) => conflicts.length > 0),
  };
}

function mergeQueries({
  base = [],
  existing,
  incoming,
  resolverFactory,
}: {
  base?: StreamQuery[];
  existing: StreamQuery[];
  incoming: StreamQuery[];
  resolverFactory: IdResolverFactory<StreamQuery>;
}): { merged: StreamQuery[]; conflicts: PropertyConflict[] } {
  const conflicts: PropertyConflict[] = [];
  const merged = uniq([
    ...(base.map((query) => query.id) ?? []),
    ...existing.map((query) => query.id),
    ...incoming.map((query) => query.id),
  ]).reduce((queries, id) => {
    const baseQuery = base.find((q) => q.id === id);
    const existingQuery = existing.find((q) => q.id === id);
    const incomingQuery = incoming.find((q) => q.id === id);

    const { value, conflict } = mergeQuery({
      base: baseQuery,
      existing: existingQuery,
      incoming: incomingQuery,
      resolver: resolverFactory((baseQuery?.id ?? existingQuery?.id ?? incomingQuery?.id)!),
    });
    if (value) {
      queries.push(value);
    }
    if (conflict) {
      conflicts.push(conflict);
    }

    return queries;
  }, [] as StreamQuery[]);

  return { merged, conflicts };
}

function mergeFields({
  base = {},
  existing,
  incoming,
  resolverFactory,
}: {
  base?: FieldDefinition;
  existing: FieldDefinition;
  incoming: FieldDefinition;
  resolverFactory: IdResolverFactory<FieldDefinition>;
}): { merged: FieldDefinition; conflicts: PropertyConflict[] } {
  const conflicts: PropertyConflict[] = [];
  const merged = uniq([
    ...Object.keys(base),
    ...Object.keys(existing),
    ...Object.keys(incoming),
  ]).reduce((fields, key) => {
    const { value, conflict } = mergeField({
      base: { [key]: base[key] },
      existing: { [key]: existing[key] },
      incoming: { [key]: incoming[key] },
      resolver: resolverFactory(key),
    });
    if (value) {
      fields[key] = value[key];
    }
    if (conflict) {
      conflicts.push(conflict);
    }

    return fields;
  }, {} as FieldDefinition);

  return { merged, conflicts };
}

function mergeRouting({
  base = [],
  existing,
  incoming,
  resolverFactory,
}: {
  base?: RoutingDefinition[];
  existing: RoutingDefinition[];
  incoming: RoutingDefinition[];
  resolverFactory: IdResolverFactory<RoutingDefinition>;
}): { merged: RoutingDefinition[]; conflicts: PropertyConflict[] } {
  const conflicts: PropertyConflict[] = [];
  const merged = uniq([
    ...existing.map((routing) => routing.destination),
    ...(base.map((routing) => routing.destination) ?? []),
    ...incoming.map((routing) => routing.destination),
  ]).reduce((routing, child) => {
    const baseRouting = base.find(({ destination }) => destination === child);
    const existingRouting = existing.find(({ destination }) => destination === child);
    const incomingRouting = incoming.find(({ destination }) => destination === child);

    const { value, conflict } = mergeRoutingDefinition({
      base: baseRouting,
      existing: existingRouting,
      incoming: incomingRouting,
      resolver: resolverFactory(child),
    });
    if (value) {
      routing.push(value);
    }
    if (conflict) {
      conflicts.push(conflict);
    }

    return routing;
  }, [] as RoutingDefinition[]);

  return { merged, conflicts };
}

function mergeChildren({
  base,
  existing,
  incoming,
  routing,
  resolverFactories,
}: {
  base?: StreamTree;
  existing: StreamTree;
  incoming: StreamTree;
  routing: RoutingDefinition[];
  resolverFactories: ConflictResolverFactories;
}) {
  const { children: mergedChildren, conflicts: childConflicts } = routing.reduce(
    ({ children, conflicts }, { destination }) => {
      const baseChild = base?.children.find((child) => child.name === destination);
      const existingChild = existing.children.find((child) => child.name === destination);
      const incomingChild = incoming.children.find((child) => child.name === destination);

      if (existingChild && incomingChild) {
        const { merged: mergedChild, conflicts: childConflicts } = mergeTrees({
          base: baseChild,
          existing: existingChild,
          incoming: incomingChild,
          resolverFactories,
        });
        children.push(mergedChild);
        conflicts.push(...childConflicts);
      } else {
        children.push((existingChild ?? incomingChild)!);
      }

      return { children, conflicts };
    },
    { children: [], conflicts: [] } as { children: StreamTree[]; conflicts: StreamConflict[] }
  );

  return { children: mergedChildren, conflicts: childConflicts };
}
