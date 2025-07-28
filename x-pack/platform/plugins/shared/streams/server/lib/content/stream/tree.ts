/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { ContentPackIncludedObjects, ContentPackStream } from '@kbn/content-packs-schema';
import { filterQueries, filterRouting, includedObjectsFor } from './helpers';
import { FieldDefinition, RoutingDefinition } from '@kbn/streams-schema';
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
 * merges the routing and fields of the root stream provided.
 * - fails when trying to merge a children that already exists
 * - fails when trying to override a conflicting field type
 */
export function mergeTrees({
  existing,
  incoming,
}: {
  existing: StreamTree;
  incoming: StreamTree;
}): StreamTree {
  const existingRouting = existing.request.stream.ingest.wired.routing;
  const incomingRouting = incoming.request.stream.ingest.wired.routing;
  assertNoConflictingRouting(existingRouting, incomingRouting);

  const existingFields = existing.request.stream.ingest.wired.fields;
  const incomingFields = Object.keys(incoming.request.stream.ingest.wired.fields)
    .filter((field) => !baseFields[field])
    .reduce((fields, field) => {
      fields[field] = incoming.request.stream.ingest.wired.fields[field];
      return fields;
    }, {} as FieldDefinition);
  assertNoConflictingFields(existingFields, incomingFields);

  const mergedRouting = [...existingRouting, ...incomingRouting];
  const mergedFields = { ...existingFields, ...incomingFields };
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

function assertNoConflictingRouting(existing: RoutingDefinition[], incoming: RoutingDefinition[]) {
  for (const { destination } of incoming) {
    if (existing.some((rule) => rule.destination === destination)) {
      throw new ContentPackConflictError(`Child stream [${destination}] already exists`);
    }
  }
}

function assertNoConflictingFields(existing: FieldDefinition, incoming: FieldDefinition) {
  for (const [field, fieldConfig] of Object.entries(incoming)) {
    if (existing[field] && !isEqual(existing[field], fieldConfig)) {
      throw new ContentPackConflictError(`Cannot change mapping of [${field}]`);
    }
  }
}
