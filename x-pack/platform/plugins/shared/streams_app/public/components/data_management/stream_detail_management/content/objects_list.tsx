/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiBasicTable, EuiCheckbox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ContentPackEntry, ContentPackStream, PARENT_STREAM_ID } from '@kbn/content-packs-schema';
import { Streams, getSegments } from '@kbn/streams-schema';

interface StreamRow {
  name: string;
  level: number;
}

function flattenStreams(streamEntries: ContentPackStream[]): StreamRow[] {
  const streamNodes = streamEntries
    .filter(({ stream }) => stream.name !== PARENT_STREAM_ID)
    .sort((a, b) => a.stream.name.localeCompare(b.stream.name));
  if (streamNodes.length === 0) {
    return [];
  }

  const offset = getSegments(streamNodes[0].stream.name).length;
  return streamNodes.map(({ stream }) => ({
    name: stream.name,
    level: getSegments(stream.name).length - offset,
  }));
}

/**
 * Component to display content pack objects list
 */
export function ContentPackObjectsList({
  definition,
  objects,
  onSelectionChange,
}: {
  definition: Streams.WiredStream.GetResponse;
  objects: ContentPackEntry[];
  onSelectionChange: (objects: { dashboards: string[]; stream: string[] }) => void;
}) {
  const streamEntries = useMemo(() => {
    return objects.filter((entry): entry is ContentPackStream => entry.type === 'stream');
  }, [objects]);
  const sortedStreams = useMemo(() => flattenStreams(streamEntries), [streamEntries]);

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    const initialSelection: Record<string, boolean> = {};
    sortedStreams.forEach((stream) => {
      initialSelection[stream.name] = true;
    });
    return initialSelection;
  });

  return (
    <EuiBasicTable
      items={sortedStreams}
      itemId="name"
      columns={[
        {
          field: 'select',
          name: '',
          width: '40px',
          render: (_, item: StreamRow) => (
            <EuiCheckbox
              id={`stream-checkbox-${item.name}`}
              checked={!!selectedItems[item.name]}
              onChange={(e) => {}}
            />
          ),
        },
        {
          field: 'name',
          name: 'Stream',
          render: (name: string, item: StreamRow) => (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={css`
                margin-left: ${item.level * 16}px;
              `}
            >
              <EuiFlexItem grow={false}>
                <span>{name}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
      ]}
      rowHeader="name"
    />
  );
}
