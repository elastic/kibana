/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiSpacer,
  EuiAccordion,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type {
  ContentPackEntry,
  ContentPackIncludedObjects,
  ContentPackStream,
} from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import {
  getAncestors,
  getAncestorsAndSelf,
  getSegments,
  isChildOf,
  isDescendantOf,
} from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { useStreamsPrivileges } from '../../../../hooks/use_streams_privileges';
import { StreamQueriesList } from './queries_list';

type StreamRow = ContentPackStream & {
  level: number;
  isParent: boolean;
};

function sortDescendants(descendants: ContentPackStream[]): StreamRow[] {
  const sorted = descendants.sort((a, b) => a.name.localeCompare(b.name));

  return sorted.map((entry, index) => {
    const next = sorted[index + 1];
    return {
      ...entry,
      level: getSegments(entry.name).length - 1,
      isParent: next ? isChildOf(entry.name, next.name) : false,
    };
  });
}
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

  const [selectedItems, setSelectedItems] = useState<
    Record<string, { selected: boolean; queries: StreamQuery[] }>
  >({
    [ROOT_STREAM_ID]: { selected: true, queries: definition.queries },
  });

  const { rootEntry, descendants } = useMemo(() => {
    if (objects.length === 0) {
      return { rootEntry: null, descendants: [] };
    }

    const root = objects.find(
      (entry): entry is ContentPackStream =>
        entry.type === 'stream' && entry.name === ROOT_STREAM_ID
    )!;

    const rows = sortDescendants(
      objects.filter(
        (entry): entry is ContentPackStream =>
          entry.type === 'stream' && entry.name !== ROOT_STREAM_ID
      )
    );

    setSelectedItems({
      [root.name]: { selected: true, queries: root.request.queries },
      ...rows.reduce((selection, { name, request }) => {
        selection[name] = { selected: true, queries: request.queries };
        return selection;
      }, {} as Record<string, { selected: boolean; queries: StreamQuery[] }>),
    });

    return { rootEntry: root, descendants: rows };
  }, [objects]);

  return !rootEntry ? null : (
    <>
      {isSignificantEventsEnabled && (
        <>
          <StreamQueriesList
            definition={{ name: rootEntry.name, queries: rootEntry.request.queries }}
            selectedQueries={selectedItems[rootEntry.name].queries}
            setSelectedQueries={(queries) => {
              const selection = { ...selectedItems };
              selection[rootEntry.name] = { ...selection[rootEntry.name], queries };
              setSelectedItems(selection);
              onSelectionChange(toIncludedObjects(selection));
            }}
          />
          <EuiSpacer />
        </>
      )}

      <EuiTitle size="xxs">
        <h5>
          {i18n.translate('xpack.streams.contentPackObjectsList.routing', {
            defaultMessage: 'Routing',
          })}
        </h5>
      </EuiTitle>
      <EuiBasicTable
        items={descendants}
        itemId="name"
        columns={[
          {
            field: 'select',
            name: '',
            width: '40px',
            render: (_, item: StreamRow) => {
              return (
                <EuiCheckbox
                  id={`checkbox-${item.name}`}
                  checked={selectedItems[item.name].selected}
                  onChange={(e) => {
                    const selection = { ...selectedItems };
                    if (e.target.checked) {
                      [
                        ...getAncestorsAndSelf(item.name),
                        ...descendants
                          .filter(({ name }) => isDescendantOf(item.name, name))
                          .map(({ name }) => name),
                      ].forEach((name) => {
                        selection[name] = { ...selection[name], selected: true };
                      });
                    } else {
                      [
                        item.name,
                        ...descendants
                          .filter(({ name }) => isDescendantOf(item.name, name))
                          .map(({ name }) => name),
                      ].forEach((name) => {
                        selection[name] = { ...selection[name], selected: false };
                      });

                      getAncestors(item.name).forEach((ancestor) => {
                        const hasSelectedChild = descendants.some(
                          ({ name }) => isDescendantOf(ancestor, name) && selection[name].selected
                        );
                        selection[ancestor] = {
                          ...selection[ancestor],
                          selected: hasSelectedChild,
                        };
                      });
                    }

                    setSelectedItems(selection);
                    onSelectionChange(toIncludedObjects(selection));
                  }}
                />
              );
            },
          },
          {
            field: 'name',
            name: '',
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

                <EuiFlexItem grow={3}>
                  {!isSignificantEventsEnabled ? (
                    <EuiFlexItem grow={false}>{name.split('.').pop()}</EuiFlexItem>
                  ) : (
                    <EuiAccordion
                      id={name}
                      buttonContent={
                        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                          <EuiFlexItem grow={false}>{name.split('.').pop()}</EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText color="subdued" size="xs">
                              {i18n.translate(
                                'xpack.streams.contentPackObjectsList.streamDetails',
                                {
                                  defaultMessage: 'details',
                                }
                              )}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      arrowDisplay="none"
                    >
                      <EuiPanel color="subdued">
                        <StreamQueriesList
                          definition={{ name: item.name, queries: item.request.queries }}
                          disabled={!selectedItems[item.name].selected}
                          selectedQueries={selectedItems[item.name].queries}
                          setSelectedQueries={(queries) => {
                            const selection = { ...selectedItems };
                            selection[item.name] = { ...selection[item.name], queries };
                            setSelectedItems(selection);
                            onSelectionChange(toIncludedObjects(selection));
                          }}
                        />
                      </EuiPanel>
                    </EuiAccordion>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
        ]}
        rowHeader="name"
      />
    </>
  );
}

function buildIncludedObjects(
  parent: string,
  selection: Record<string, { selected: boolean; queries: StreamQuery[] }>
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
      queries: selection[parent].queries.map((query) => ({ id: query.id })),
      routing: children.map((child) => ({
        destination: child,
        ...buildIncludedObjects(child, selection),
      })),
    },
  };
}

function toIncludedObjects(
  selection: Record<string, { selected: boolean; queries: StreamQuery[] }>
): ContentPackIncludedObjects {
  return buildIncludedObjects(ROOT_STREAM_ID, selection);
}
