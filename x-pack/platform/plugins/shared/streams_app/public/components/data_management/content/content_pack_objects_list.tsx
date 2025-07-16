/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiCheckbox, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { ContentPackEntry, ContentPackStream, PARENT_STREAM_ID } from '@kbn/content-packs-schema';
import { getSegments } from '@kbn/streams-schema';

type StreamRow = ContentPackStream & {
  level: number;
};

function sortStreams(streamEntries: ContentPackStream[]): StreamRow[] {
  const sortedEntries = streamEntries
    .filter(({ stream }) => stream.name !== PARENT_STREAM_ID)
    .sort((a, b) => a.stream.name.localeCompare(b.stream.name));
  if (sortedEntries.length === 0) {
    return [];
  }

  const offset = getSegments(sortedEntries[0].stream.name).length;
  return sortedEntries.map((entry) => ({
    ...entry,
    level: getSegments(entry.stream.name).length - offset,
  }));
}

export function ContentPackObjectsList({
  objects,
  onSelectionChange,
}: {
  objects: ContentPackEntry[];
  onSelectionChange: (objects: ContentPackEntry[]) => void;
}) {
  const sortedStreams = sortStreams(
    objects.filter((entry): entry is ContentPackStream => entry.type === 'stream')
  );

  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    const initialSelection: Record<string, boolean> = {};
    sortedStreams.forEach(({ stream }) => {
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
              id={`stream-checkbox-${item.stream.name}`}
              checked={!!selectedItems[item.stream.name]}
              onChange={(e) => {}}
            />
          ),
        },
        {
          field: 'stream.name',
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
