/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit } from 'lodash';
import { ContentPackStream, PARENT_STREAM_ID } from '@kbn/content-packs-schema';
import { FieldDefinition, InheritedFieldDefinition, Streams } from '@kbn/streams-schema';

export function prepareStreamsForExport({
  root,
  descendants,
  inheritedFields,
}: {
  root: Streams.WiredStream.Definition;
  descendants: Streams.WiredStream.Definition[];
  inheritedFields: InheritedFieldDefinition;
}) {
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
            routing: root.ingest.wired.routing.map((routing) => ({
              ...routing,
              destination: withoutRootPrefix(routing.destination, root.name),
            })),
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
        name: withoutRootPrefix(stream.name, root.name),
        ingest: {
          ...stream.ingest,
          wired: {
            ...stream.ingest.wired,
            routing: stream.ingest.wired.routing.map((routing) => ({
              ...routing,
              destination: withoutRootPrefix(routing.destination, root.name),
            })),
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
  const definitions: Streams.WiredStream.Definition[] = entries.map((entry) => {
    if (entry.stream.name === PARENT_STREAM_ID) {
      return {
        ...root,
        ingest: {
          ...root.ingest,
          wired: {
            ...root.ingest.wired,
            routing: root.ingest.wired.routing.concat(
              entry.stream.ingest.wired.routing.map((routing) => ({
                ...routing,
                destination: withRootPrefix(routing.destination, root.name),
              }))
            ),
            fields: {
              ...root.ingest.wired.fields,
              ...Object.keys(entry.stream.ingest.wired.fields)
                .filter((key) => !root.ingest.wired.fields[key] && !inheritedFields[key])
                .reduce((acc, key) => {
                  acc[key] = { ...entry.stream.ingest.wired.fields[key] };
                  return acc;
                }, {} as FieldDefinition),
            },
          },
        },
      };
    }

    return {
      ...entry.stream,
      name: withRootPrefix(entry.stream.name, root.name),
      ingest: {
        ...entry.stream.ingest,
        wired: {
          ...entry.stream.ingest.wired,
          routing: entry.stream.ingest.wired.routing.map((routing) => ({
            ...routing,
            destination: withRootPrefix(routing.destination, root.name),
          })),
        },
      },
    };
  });

  return definitions;
}

function withoutRootPrefix(name: string, root: string) {
  return name.replace(root + '.', '');
}

function withRootPrefix(name: string, root: string) {
  return `${root}.${name}`;
}
