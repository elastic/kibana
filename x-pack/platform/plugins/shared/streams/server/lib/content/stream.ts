/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniq } from 'lodash';
import { ContentPackStream, ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { FieldDefinition, RoutingDefinition, getAncestorsAndSelf } from '@kbn/streams-schema';
import { baseFields } from '../streams/component_templates/logs_layer';
import { ContentPackConflictError } from './error';

export function prepareStreamsForExport({
  root,
  descendants,
  inheritedFields,
}: {
  root: ContentPackStream;
  descendants: ContentPackStream[];
  inheritedFields: FieldDefinition;
}): ContentPackStream[] {
  const prepareIncludedDestinations = prepareRouting(descendants, (destination) =>
    withoutRootPrefix(root.name, destination)
  );

  const streamObjects: ContentPackStream[] = [
    {
      type: 'stream' as const,
      name: ROOT_STREAM_ID,
      request: {
        dashboards: [],
        queries: [],
        stream: {
          ...root.request.stream,
          ingest: {
            ...root.request.stream.ingest,
            wired: {
              ...root.request.stream.ingest.wired,
              routing: prepareIncludedDestinations(root.request.stream.ingest.wired.routing),
              fields: {
                ...inheritedFields,
                ...root.request.stream.ingest.wired.fields,
              },
            },
          },
        },
      },
    },
    ...descendants.map((entry) => ({
      type: 'stream' as const,
      name: withoutRootPrefix(root.name, entry.name),
      request: {
        ...entry.request,
        stream: {
          ...entry.request.stream,
          ingest: {
            ...entry.request.stream.ingest,
            wired: {
              ...entry.request.stream.ingest.wired,
              routing: prepareIncludedDestinations(entry.request.stream.ingest.wired.routing),
            },
          },
        },
      },
    })),
  ];

  return streamObjects;
}

export function prepareStreamsForImport({
  root,
  entries,
}: {
  root: ContentPackStream;
  entries: ContentPackStream[];
}): ContentPackStream[] {
  const prepareIncludedDestinations = prepareRouting(entries, (destination) =>
    withRootPrefix(root.name, destination)
  );

  const streamObjects = entries.map(({ name, request }) => {
    if (name === ROOT_STREAM_ID) {
      const rootRouting = root.request.stream.ingest.wired.routing;
      const importedRouting = prepareIncludedDestinations(request.stream.ingest.wired.routing);
      assertNoConflictingRouting(rootRouting, importedRouting);

      const rootFields = root.request.stream.ingest.wired.fields;
      const importedFields = Object.keys(request.stream.ingest.wired.fields)
        .filter((field) => !baseFields[field])
        .reduce((fields, field) => {
          fields[field] = request.stream.ingest.wired.fields[field];
          return fields;
        }, {} as FieldDefinition);
      assertNoConflictingFields(rootFields, importedFields);

      const mergedRouting = [...rootRouting, ...importedRouting];
      const mergedFields = { ...rootFields, ...importedFields };

      return {
        type: 'stream' as const,
        name: root.name,
        request: {
          ...root.request,
          stream: {
            ...root.request.stream,
            ingest: {
              ...root.request.stream.ingest,
              wired: {
                ...root.request.stream.ingest.wired,
                routing: mergedRouting,
                fields: mergedFields,
              },
            },
          },
        },
      };
    }

    return {
      type: 'stream' as const,
      name: withRootPrefix(root.name, name),
      request: {
        ...request,
        stream: {
          ...request.stream,
          ingest: {
            ...request.stream.ingest,
            wired: {
              ...request.stream.ingest.wired,
              routing: prepareIncludedDestinations(request.stream.ingest.wired.routing),
            },
          },
        },
      },
    };
  });

  return streamObjects;
}

const prepareRouting =
  (descendants: ContentPackStream[], prepareDestination: (name: string) => string) =>
  (routing: RoutingDefinition[]) => {
    return routing
      .filter((definition) =>
        descendants.some((descendant) => descendant.name === definition.destination)
      )
      .map((definition) => ({
        ...definition,
        destination: prepareDestination(definition.destination),
      }));
  };

export function withoutRootPrefix(root: string, name: string) {
  const prefix = `${root}.`;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function withRootPrefix(root: string, name: string) {
  return `${root}.${name}`;
}

export function resolveAncestors(leafs: string[]) {
  const streamNames = leafs.flatMap((name) => getAncestorsAndSelf(name));
  return uniq(streamNames);
}

function assertNoConflictingRouting(
  rootRouting: RoutingDefinition[],
  importedRouting: RoutingDefinition[]
) {
  for (const { destination } of importedRouting) {
    if (rootRouting.some((rule) => rule.destination === destination)) {
      throw new ContentPackConflictError(`Child stream [${destination}] already exists`);
    }
  }
}

function assertNoConflictingFields(rootFields: FieldDefinition, importedFields: FieldDefinition) {
  for (const [field, fieldConfig] of Object.entries(importedFields)) {
    if (rootFields[field] && !isEqual(rootFields[field], fieldConfig)) {
      throw new ContentPackConflictError(`Cannot change mapping of [${field}]`);
    }
  }
}
