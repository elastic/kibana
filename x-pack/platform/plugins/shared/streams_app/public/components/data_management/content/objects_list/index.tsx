/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type {
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { getSegments, isChildOf } from '@kbn/streams-schema';
import { EuiCheckbox, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamTree } from './tree';
import { containsAssets, containsMappings } from '../helpers';

export function ContentPackObjectsList({
  objects,
  onSelectionChange,
  significantEventsAvailable,
}: {
  objects: ContentPackEntry[];
  onSelectionChange: (objects: ContentPackIncludedObjects) => void;
  significantEventsAvailable: boolean;
}) {
  const streamEntries = objects.filter(
    (entry): entry is ContentPackStream => entry.type === 'stream'
  );
  const [includeMappings, setIncludeMappings] = useState<boolean>(containsMappings(streamEntries));
  const [includeAssets, setIncludeAssets] = useState<boolean>(containsAssets(streamEntries));
  const [selection, setSelection] = useState<Record<string, { selected: boolean }>>({
    ...objects
      .filter((entry): entry is ContentPackStream => entry.type === 'stream')
      .reduce((map, stream) => {
        map[stream.name] = { selected: true };
        return map;
      }, {} as Record<string, { selected: boolean }>),
  });

  const { rootEntry, descendants } = useMemo(() => {
    if (objects.length === 0) {
      return { rootEntry: null, descendants: [] };
    }

    const root = objects.find(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name === ROOT_STREAM_ID
    )!;

    const others = objects.filter(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name !== ROOT_STREAM_ID
    );

    return { rootEntry: root, descendants: others };
  }, [objects]);

  return !rootEntry ? null : (
    <>
      <EuiFlexGroup alignItems="center" direction="row" gutterSize="s">
        <EuiCheckbox
          id="include-mappings"
          disabled={!containsMappings(streamEntries)}
          checked={includeMappings}
          label={i18n.translate('xpack.streams.contentPackObjectsList.includeMappings', {
            defaultMessage: 'Include mappings of the root stream and selected streams partitions',
          })}
          onChange={() => {
            const include = !includeMappings;
            setIncludeMappings(include);
            onSelectionChange(
              toIncludedObjects({
                selection,
                objects: [rootEntry, ...descendants],
                includeAssets,
                includeMappings: include,
              })
            );
          }}
        />
      </EuiFlexGroup>

      <EuiFlexGroup alignItems="center" direction="row" gutterSize="s">
        {significantEventsAvailable ? (
          <EuiCheckbox
            id="include-all-assets"
            disabled={!containsAssets(streamEntries)}
            checked={includeAssets}
            label={i18n.translate('xpack.streams.contentPackObjectsList.includeAllAssets', {
              defaultMessage:
                'Include significant events of the root stream and selected streams partitions',
            })}
            onChange={() => {
              const include = !includeAssets;
              setIncludeAssets(include);
              onSelectionChange(
                toIncludedObjects({
                  selection,
                  objects: [rootEntry, ...descendants],
                  includeAssets: include,
                  includeMappings,
                })
              );
            }}
          />
        ) : null}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <StreamTree
        streams={descendants}
        onSelectionChange={(streamsSelection) => {
          setSelection(streamsSelection);

          onSelectionChange(
            toIncludedObjects({
              selection: streamsSelection,
              objects: [rootEntry, ...descendants],
              includeAssets,
              includeMappings,
            })
          );
        }}
      />
    </>
  );
}

function buildIncludedObjects(
  parent: string,
  selection: Record<string, { selected: boolean }>,
  objects: ContentPackStream[],
  includeAssets: boolean,
  includeMappings: boolean
): ContentPackIncludedObjects {
  const children = Object.keys(selection).filter((key) => {
    if (!selection[key].selected) {
      return false;
    }

    if (parent === ROOT_STREAM_ID) {
      return key !== ROOT_STREAM_ID && getSegments(key).length === 1;
    }
    return isChildOf(parent, key);
  });

  return {
    objects: {
      mappings: includeMappings,
      queries: !includeAssets
        ? []
        : objects
            .find(({ name }) => name === parent)!
            .request.queries.map((query) => ({ id: query.id })),
      routing: children.map((child) => ({
        destination: child,
        ...buildIncludedObjects(child, selection, objects, includeAssets, includeMappings),
      })),
    },
  };
}

function toIncludedObjects({
  selection,
  objects,
  includeAssets,
  includeMappings,
}: {
  selection: Record<string, { selected: boolean }>;
  objects: ContentPackStream[];
  includeAssets: boolean;
  includeMappings: boolean;
}): ContentPackIncludedObjects {
  return buildIncludedObjects(ROOT_STREAM_ID, selection, objects, includeAssets, includeMappings);
}
