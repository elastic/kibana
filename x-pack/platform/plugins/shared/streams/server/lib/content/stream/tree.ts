/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
import { FieldDefinition } from '@kbn/streams-schema';
import { filterQueries, filterRouting, includedObjectsFor } from './helpers';
import { ContentPackConflictError } from '../error';
import { baseFields } from '../../streams/component_templates/logs_layer';

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

/**
 * merges the root streams provided.
 * this is not called recursively on the children as we currently
 * fail when trying to merge a child that already exists.
 */
export function mergeTrees({
  existing,
  incoming,
}: {
  existing: StreamTree;
  incoming: StreamTree;
}): StreamTree {
  assertNoConflicts(existing, incoming);

  const mergedRouting = [
    ...existing.request.stream.ingest.wired.routing,
    ...incoming.request.stream.ingest.wired.routing,
  ];
  const mergedFields = {
    ...existing.request.stream.ingest.wired.fields,
    ...Object.keys(incoming.request.stream.ingest.wired.fields)
      .filter((field) => !baseFields[field])
      .reduce((fields, field) => {
        fields[field] = incoming.request.stream.ingest.wired.fields[field];
        return fields;
      }, {} as FieldDefinition),
  };
  const mergedQueries = [...existing.request.queries, ...incoming.request.queries];
  const mergedChildren = [...existing.children, ...incoming.children];

  return {
    type: 'stream' as const,
    name: existing.name,
    request: {
      ...existing.request,
      queries: mergedQueries,
      stream: {
        ...existing.request.stream,
        ingest: {
          ...existing.request.stream.ingest,
          wired: {
            ...existing.request.stream.ingest.wired,
            routing: mergedRouting,
            fields: mergedFields,
          },
        },
      },
    },
    children: mergedChildren,
  };
}

function assertNoConflicts(existing: ContentPackStream, incoming: ContentPackStream) {
  // routing
  for (const { destination } of incoming.request.stream.ingest.wired.routing) {
    if (
      existing.request.stream.ingest.wired.routing.some((rule) => rule.destination === destination)
    ) {
      throw new ContentPackConflictError(`[${destination}] already exists`);
    }
  }

  // fields
  for (const [field, fieldConfig] of Object.entries(incoming.request.stream.ingest.wired.fields)) {
    const existingField = existing.request.stream.ingest.wired.fields[field];
    if (existingField && !isEqual(existingField, fieldConfig)) {
      throw new ContentPackConflictError(
        `Cannot change mapping of [${field}] for [${existing.name}]`
      );
    }
  }

  // queries
  for (const { id, title } of incoming.request.queries) {
    if (existing.request.queries.some((query) => query.id === id)) {
      throw new ContentPackConflictError(
        `Query [${id} | ${title}] already exists on [${existing.name}]`
      );
    }
  }
}
