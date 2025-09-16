/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type {
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import type { Streams } from '@kbn/streams-schema';
import { getSegments, isChildOf } from '@kbn/streams-schema';
import { EuiCheckbox, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { StreamTree } from './tree';

export function ContentPackObjectsList({
  definition,
  objects,
  onSelectionChange,
}: {
  definition: Streams.WiredStream.GetResponse;
  objects: ContentPackEntry[];
  onSelectionChange: (objects: ContentPackIncludedObjects) => void;
}) {
  const {
    features: { significantEvents },
  } = useStreamsPrivileges();

  const isSignificantEventsEnabled = !!significantEvents?.available;
  const [includeAssets, setIncludeAssets] = useState<boolean>(isSignificantEventsEnabled);
  const [selection, setSelection] = useState<Record<string, { selected: boolean }>>({});

  useEffect(() => {
    if (!significantEvents) return;
    setIncludeAssets(significantEvents.available);
    setSelection({
      ...objects
        .filter((entry): entry is ContentPackStream => entry.type === 'stream')
        .reduce((map, stream) => {
          map[stream.name] = { selected: true };
          return map;
        }, {} as Record<string, { selected: boolean }>),
    });
  }, [significantEvents?.available, objects]);

  const { rootEntry, descendants } = useMemo(() => {
    if (objects.length === 0) {
      return { rootEntry: null, descendants: [] };
    }

    const root = objects.find(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name === ROOT_STREAM_ID
    )!;

    const descendants = objects.filter(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name !== ROOT_STREAM_ID
    );

    return { rootEntry: root, descendants };
  }, [objects]);

  return !rootEntry ? null : (
    <>
      <EuiFlexGroup alignItems="center" direction="row" gutterSize="s">
        {isSignificantEventsEnabled ? (
          <EuiCheckbox
            id="include-all-assets"
            checked={includeAssets}
            label={i18n.translate('xpack.streams.contentPackObjectsList.includeAllAssets', {
              defaultMessage:
                'Include significant events of the root stream and selected streams partitions',
            })}
            onChange={() => {
              const include = !includeAssets;
              setIncludeAssets(include);
              onSelectionChange(toIncludedObjects(selection, [rootEntry, ...descendants], include));
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
            toIncludedObjects(streamsSelection, [rootEntry, ...descendants], includeAssets)
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
  includeAssets: boolean
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
      queries: !includeAssets
        ? []
        : objects
            .find(({ name }) => name === parent)!
            .request.queries.map((query) => ({ id: query.id })),
      routing: children.map((child) => ({
        destination: child,
        ...buildIncludedObjects(child, selection, objects, includeAssets),
      })),
    },
  };
}

function toIncludedObjects(
  selection: Record<string, { selected: boolean }>,
  objects: ContentPackStream[],
  includeAssets: boolean
): ContentPackIncludedObjects {
  return buildIncludedObjects(ROOT_STREAM_ID, selection, objects, includeAssets);
}
