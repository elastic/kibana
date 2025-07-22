/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiBasicTable, EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { ContentPackEntry, ContentPackStream, ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import {
  Streams,
  getAncestors,
  getAncestorsAndSelf,
  getSegments,
  isChildOf,
  isDescendantOf,
} from '@kbn/streams-schema';
import { omit } from 'lodash';

type StreamRow = ContentPackStream & {
  level: number;
  isParent: boolean;
};

function sortStreams(
  definition: Streams.WiredStream.GetResponse,
  streamEntries: ContentPackStream[]
): StreamRow[] {
  const sortedEntries = streamEntries
    .filter(({ name }) => name !== ROOT_STREAM_ID)
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    {
      type: 'stream',
      name: definition.stream.name,
      request: {
        dashboards: [],
        queries: [],
        stream: { ...omit(definition.stream, 'name') },
      },
      level: 0,
      isParent: sortedEntries.length > 0,
    },
    ...sortedEntries.map((entry, index) => {
      const next = sortedEntries[index + 1];
      return {
        ...entry,
        level: getSegments(entry.name).length,
        isParent: next ? isChildOf(entry.name, next.name) : false,
      };
    }),
  ];
}

export function ContentPackObjectsList({
  definition,
  objects,
  onSelectionChange,
}: {
  definition: Streams.WiredStream.GetResponse;
  objects: ContentPackEntry[];
  onSelectionChange: (objects: ContentPackEntry[]) => void;
}) {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const sortedStreams = useMemo(() => {
    const rows = sortStreams(
      definition,
      objects.filter((entry): entry is ContentPackStream => entry.type === 'stream')
    );
    const selection: Record<string, boolean> = {};
    rows.forEach(({ name }) => (selection[name] = true));
    setSelectedItems(selection);
    onSelectionChange(
      objects.filter(
        (entry): entry is ContentPackStream => entry.type === 'stream' && selection[entry.name]
      )
    );

    return rows;
  }, [definition, objects, onSelectionChange]);

  return (
    <EuiBasicTable
      items={sortedStreams}
      itemId="name"
      columns={[
        {
          field: 'select',
          name: '',
          width: '40px',
          render: (_, item: StreamRow) => {
            if (item.level === 0) return null;

            return (
              <EuiCheckbox
                id={`stream-checkbox-${item.name}`}
                checked={!!selectedItems[item.name]}
                onChange={(e) => {
                  const selection = { ...selectedItems };
                  if (e.target.checked) {
                    [
                      ...getAncestorsAndSelf(item.name),
                      ...Object.keys(selection).filter((name) => isDescendantOf(item.name, name)),
                    ].forEach((name) => {
                      selection[name] = true;
                    });
                  } else {
                    const streamNames = Object.keys(selection);
                    streamNames
                      .filter((name) => name === item.name || isDescendantOf(item.name, name))
                      .forEach((name) => (selection[name] = false));

                    getAncestors(item.name)
                      .reverse()
                      .forEach((ancestor) => {
                        const hasSelectedChild = streamNames.some(
                          (name) => isDescendantOf(ancestor, name) && selection[name]
                        );
                        selection[ancestor] = hasSelectedChild;
                      });
                  }

                  setSelectedItems(selection);
                  onSelectionChange(
                    objects.filter(
                      (entry): entry is ContentPackStream =>
                        entry.type === 'stream' && selection[entry.name]
                    )
                  );
                }}
              />
            );
          },
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
              {item.isParent ? (
                <EuiFlexItem grow={false}>
                  <EuiIcon type="arrowDown" />
                </EuiFlexItem>
              ) : (
                <EuiFlexItem
                  grow={false}
                  css={css`
                    margin-left: 16px;
                  `}
                />
              )}
              <EuiFlexItem grow={false}>
                <span>{getSegments(name).pop()}</span>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        },
      ]}
      rowHeader="name"
    />
  );
}
