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
  Streams,
  getAncestorsAndSelf,
} from '@kbn/streams-schema';

export function prepareStreamsForExport({
  root,
  descendants,
  inheritedFields,
}: {
  root: Streams.WiredStream.Definition;
  descendants: Streams.WiredStream.Definition[];
  inheritedFields: InheritedFieldDefinition;
}) {
  const prepareIncludedDestinations = prepareRouting(descendants, (destination) =>
    withoutRootPrefix(root.name, destination)
  );

  const streamObjects: ContentPackStream[] = [
    {
      type: 'stream',
      id: PARENT_STREAM_ID,
      stream: {
        ...root,
        name: PARENT_STREAM_ID,
        ingest: {
          ...root.ingest,
          wired: {
            ...root.ingest.wired,
            routing: prepareIncludedDestinations(root.ingest.wired.routing),
            fields: {
              ...root.ingest.wired.fields,
              ...mapValues(inheritedFields, (field) => omit(field, ['from'])),
            },
          },
        },
      },
    },
    ...descendants.map((stream) => ({
      type: 'stream' as const,
      id: stream.name,
      stream: {
        ...stream,
        name: withoutRootPrefix(root.name, stream.name),
        ingest: {
          ...stream.ingest,
          wired: {
            ...stream.ingest.wired,
            routing: prepareIncludedDestinations(stream.ingest.wired.routing),
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
  root: Streams.WiredStream.Definition;
  entries: ContentPackStream[];
  inheritedFields: InheritedFieldDefinition;
}) {
  const prepareIncludedDestinations = prepareRouting(
    entries.map((entry) => entry.stream),
    (destination) => withRootPrefix(root.name, destination)
  );

  const definitions: Streams.WiredStream.Definition[] = entries.map(({ stream }) => {
    if (stream.name === PARENT_STREAM_ID) {
      return {
        ...root,
        ingest: {
          ...root.ingest,
          wired: {
            ...root.ingest.wired,
            routing: root.ingest.wired.routing.concat(
              prepareIncludedDestinations(stream.ingest.wired.routing)
            ),
            fields: {
              ...root.ingest.wired.fields,
              ...Object.keys(stream.ingest.wired.fields)
                .filter((key) => !root.ingest.wired.fields[key] && !inheritedFields[key])
                .reduce((acc, key) => {
                  acc[key] = { ...stream.ingest.wired.fields[key] };
                  return acc;
                }, {} as FieldDefinition),
            },
          },
        },
      };
    }

    return {
      ...stream,
      name: withRootPrefix(root.name, stream.name),
      ingest: {
        ...stream.ingest,
        wired: {
          ...stream.ingest.wired,
          routing: prepareIncludedDestinations(stream.ingest.wired.routing),
        },
      },
    };
  });

  return definitions;
}

const prepareRouting =
  (descendants: Streams.WiredStream.Definition[], prepareDestination: (name: string) => string) =>
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
