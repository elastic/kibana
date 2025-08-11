/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intersectionBy, omit } from 'lodash';
import {
  ConflictResolution,
  ContentPackIncludedObjects,
  ContentPackStream,
  MergeableProperties,
  MergeablePropertiesKeys,
  ROOT_STREAM_ID,
  isIncludeAll,
} from '@kbn/content-packs-schema';
import { ContentPackIncludeError } from '../error';
import { QueryLink } from '../../../../common/assets';
import { FieldDefinition, RoutingDefinition, StreamQuery, Streams } from '@kbn/streams-schema';

export function withoutRootPrefix(root: string, name: string) {
  const prefix = `${root}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function withRootPrefix(root: string, name: string) {
  return `${root}.${name}`;
}

export function includedObjectsFor(
  stream: string,
  include: ContentPackIncludedObjects
): ContentPackIncludedObjects {
  if (isIncludeAll(include)) {
    return include;
  }

  for (const routing of include.objects.routing) {
    if (stream === routing.destination) {
      return routing;
    }
  }

  throw new ContentPackIncludeError(`Could not find included objects for stream [${stream}]`);
}

export function filterQueries(entry: ContentPackStream, include: ContentPackIncludedObjects) {
  if (isIncludeAll(include)) {
    return entry.request.queries;
  }

  return include.objects.queries.map(({ id }) => {
    const existingQuery = entry.request.queries.find((query) => query.id === id);
    if (!existingQuery) {
      throw new ContentPackIncludeError(`Stream [${entry.name}] does not define query [${id}]`);
    }
    return existingQuery;
  });
}

export function filterRouting(entry: ContentPackStream, include: ContentPackIncludedObjects) {
  const routing = entry.request.stream.ingest.wired.routing;
  if (isIncludeAll(include)) {
    return routing;
  }

  const existingDestinations = new Set(routing.map(({ destination }) => destination));
  include.objects.routing.forEach(({ destination }) => {
    if (!existingDestinations.has(destination)) {
      throw new ContentPackIncludeError(
        `Stream [${entry.name}] does not route to [${destination}]`
      );
    }
  });

  return intersectionBy(routing, include.objects.routing, ({ destination }) => destination);
}

export function scopeContentPackStreams({
  root,
  streams,
}: {
  root: string;
  streams: ContentPackStream[];
}): ContentPackStream[] {
  return streams.map((stream) => ({
    ...stream,
    name: stream.name === ROOT_STREAM_ID ? root : withRootPrefix(root, stream.name),
    request: {
      ...stream.request,
      stream: {
        ...stream.request.stream,
        ingest: {
          ...stream.request.stream.ingest,
          wired: {
            ...stream.request.stream.ingest.wired,
            routing: stream.request.stream.ingest.wired.routing.map((definition) => ({
              ...definition,
              destination: withRootPrefix(root, definition.destination),
            })),
          },
        },
      },
    },
  }));
}

export function scopeIncludedObjects({
  root,
  include,
}: {
  root: string;
  include: ContentPackIncludedObjects;
}): ContentPackIncludedObjects {
  if (isIncludeAll(include)) {
    return include;
  }

  return {
    objects: {
      ...include.objects,
      routing: include.objects.routing.map((routing) => ({
        ...scopeIncludedObjects({ root, include: routing }),
        destination: withRootPrefix(root, routing.destination),
      })),
    },
  };
}

export function asContentPackEntry({
  stream,
  queryLinks,
}: {
  stream: Streams.WiredStream.Definition;
  queryLinks: QueryLink[];
}): ContentPackStream {
  return {
    type: 'stream' as const,
    name: stream.name,
    request: {
      stream: { ...omit(stream, ['name']) },
      queries: queryLinks.map(({ query }) => query),
      dashboards: [],
    },
  };
}

type resolverFn<T> = (existing: T, incoming: T) => { source: 'user' | 'system'; value: T };

function buildResolver<K extends MergeablePropertiesKeys>(
  resolutions: ConflictResolution[],
  predicate: (
    value: MergeableProperties[K]
  ) => (resolution: ConflictResolution) => resolution is ConflictResolution<K>
): resolverFn<MergeableProperties[K]> {
  return (existing: MergeableProperties[K], incoming: MergeableProperties[K]) => {
    const resolution = resolutions.find(predicate(existing));
    if (resolution) {
      return { source: 'user', value: resolution.value };
    }

    return { source: 'system', value: existing };
  };
}

export type ConflictResolvers = {
  query: resolverFn<StreamQuery>;
  field: resolverFn<FieldDefinition>;
  routing: resolverFn<RoutingDefinition>;
};

export function buildResolvers(resolutions: ConflictResolution[]): ConflictResolvers {
  return {
    query: buildResolver<'query'>(
      resolutions,
      (query) =>
        (resolution): resolution is ConflictResolution<'query'> => {
          return resolution.type === 'query' && query.id === resolution.id;
        }
    ),
    field: buildResolver<'field'>(
      resolutions,
      (field) =>
        (resolution): resolution is ConflictResolution<'field'> => {
          return resolution.type === 'field' && Object.keys(field)[0] === resolution.id;
        }
    ),
    routing: buildResolver<'routing'>(
      resolutions,
      (routing) =>
        (resolution): resolution is ConflictResolution<'routing'> => {
          return resolution.type === 'field' && routing.destination === resolution.id;
        }
    ),
  };
}
