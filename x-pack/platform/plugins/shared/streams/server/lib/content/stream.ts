/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit, uniq } from 'lodash';
import { ContentPackStream, PARENT_STREAM_ID } from '@kbn/content-packs-schema';
import {
  FieldDefinition,
  InheritedFieldDefinition,
  RoutingDefinition,
  getAncestorsAndSelf,
} from '@kbn/streams-schema';

export function prepareStreamsForExport({
  root,
  descendants,
  inheritedFields,
}: {
  root: ContentPackStream;
  descendants: ContentPackStream[];
  inheritedFields: InheritedFieldDefinition;
}): ContentPackStream[] {
  const prepareIncludedDestinations = prepareRouting(descendants, (destination) =>
    withoutRootPrefix(root.name, destination)
  );

  const streamObjects: ContentPackStream[] = [
    {
      type: 'stream' as const,
      name: PARENT_STREAM_ID,
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
                ...root.request.stream.ingest.wired.fields,
                ...mapValues(inheritedFields, (field) => omit(field, ['from'])),
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
  inheritedFields,
}: {
  root: ContentPackStream;
  entries: ContentPackStream[];
  inheritedFields: InheritedFieldDefinition;
}): ContentPackStream[] {
  const prepareIncludedDestinations = prepareRouting(entries, (destination) =>
    withRootPrefix(root.name, destination)
  );

  const streamObjects = entries.map(({ name, request }) => {
    if (name === PARENT_STREAM_ID) {
      // merge special parent stream's routing and fields with the new root
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
                routing: root.request.stream.ingest.wired.routing.concat(
                  prepareIncludedDestinations(request.stream.ingest.wired.routing)
                ),
                fields: {
                  ...root.request.stream.ingest.wired.fields,
                  ...Object.keys(request.stream.ingest.wired.fields)
                    .filter(
                      (key) =>
                        !root.request.stream.ingest.wired.fields[key] && !inheritedFields[key]
                    )
                    .reduce((acc, key) => {
                      acc[key] = { ...request.stream.ingest.wired.fields[key] };
                      return acc;
                    }, {} as FieldDefinition),
                },
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
      .filter((routing) =>
        descendants.some((descendant) => descendant.name === routing.destination)
      )
      .map((routing) => ({
        ...routing,
        destination: prepareDestination(routing.destination),
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
