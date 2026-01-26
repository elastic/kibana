/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ContentPackStream } from '@kbn/content-packs-schema';
import {
  getAncestors,
  getAncestorsAndSelf,
  getSegments,
  isDescendantOf,
} from '@kbn/streams-schema';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface StreamRow {
  name: string;
  expanded: boolean;
  selected: boolean;
  parent: boolean;
}

export function StreamTree({
  streams,
  onSelectionChange,
}: {
  streams: ContentPackStream[];
  onSelectionChange: (selection: Record<string, { selected: boolean }>) => void;
}) {
  const [rows, setRows] = React.useState(
    streams
      .sort((a, b) => a.name.localeCompare(b.name))
      .reduce((map, stream, index, sorted) => {
        const next = sorted[index + 1];
        map[stream.name] = {
          name: stream.name,
          expanded: true,
          selected: true,
          parent: !!(next && isDescendantOf(stream.name, next.name)),
        };
        return map;
      }, {} as Record<string, StreamRow>)
  );

  const sortedRows = React.useMemo(() => {
    return Object.values(rows).filter(({ name }) =>
      getAncestors(name).every((ancestor) => rows[ancestor].expanded)
    );
  }, [rows]);
  const hasDepth = React.useMemo(
    () => Object.values(rows).some((row) => getSegments(row.name).length > 1),
    [rows]
  );

  const selectedCount = Object.values(rows).filter(({ selected }) => selected).length;

  return (
    <EuiPanel color="subdued" paddingSize="s" hasShadow={false} hasBorder={false}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <b>
            {i18n.translate('xpack.streams.contentPackObjectsList.selectStreamsPartitions', {
              defaultMessage: 'Select streams partitions',
            })}
          </b>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            {selectedCount === Object.values(rows).length ? (
              <EuiLink
                onClick={() => {
                  setRows((prevRows) => {
                    const updated = { ...prevRows };
                    Object.keys(updated).forEach((key) => {
                      updated[key].selected = false;
                    });
                    onSelectionChange(updated);
                    return updated;
                  });
                }}
              >
                {i18n.translate('xpack.streams.contentPackObjectsList.unselectAll', {
                  defaultMessage: 'Unselect all',
                })}
              </EuiLink>
            ) : (
              <EuiLink
                onClick={() => {
                  setRows((prevRows) => {
                    const updated = { ...prevRows };
                    Object.keys(updated).forEach((key) => {
                      updated[key].selected = true;
                    });
                    onSelectionChange(updated);
                    return updated;
                  });
                }}
              >
                {i18n.translate('xpack.streams.contentPackObjectsList.selectAll', {
                  defaultMessage: 'Select all',
                })}
              </EuiLink>
            )}
            <EuiText color="subdued" size="s">
              {selectedCount}/{Object.values(rows).length} selected
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {sortedRows.map((item, index) => {
        return (
          <div key={item.name}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={css`
                margin-left: ${(getSegments(item.name).length - 1) * 28}px;
              `}
            >
              {item.parent ? (
                item.expanded ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      aria-label={i18n.translate('xpack.streams.contentPack.tree.collapse', {
                        defaultMessage: 'Collapse',
                      })}
                      iconType="arrowDown"
                      color="text"
                      onClick={() => {
                        setRows((prevRows) => {
                          const updated = { ...prevRows };
                          updated[item.name].expanded = false;
                          onSelectionChange(updated);
                          return updated;
                        });
                      }}
                    />
                  </EuiFlexItem>
                ) : (
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      aria-label={i18n.translate('xpack.streams.contentPack.tree.expand', {
                        defaultMessage: 'Expand',
                      })}
                      iconType="arrowRight"
                      color="text"
                      onClick={() => {
                        setRows((prevRows) => {
                          const updated = { ...prevRows };
                          updated[item.name].expanded = true;
                          onSelectionChange(updated);
                          return updated;
                        });
                      }}
                    />
                  </EuiFlexItem>
                )
              ) : (
                <EuiFlexItem
                  grow={false}
                  css={
                    hasDepth
                      ? css`
                          margin-left: 24px;
                          height: 24px;
                        `
                      : undefined
                  }
                />
              )}

              <EuiCheckbox
                id={`checkbox-${item.name}`}
                checked={item.selected}
                indeterminate={
                  item.selected && item.parent && !allDescendantsSelected(item.name, rows)
                }
                label={item.name}
                onChange={(e) => {
                  const selection = { ...rows };
                  if (e.target.checked) {
                    [
                      ...getAncestorsAndSelf(item.name),
                      ...streams
                        .filter(({ name }) => isDescendantOf(item.name, name))
                        .map(({ name }) => name),
                    ].forEach((name) => {
                      selection[name] = { ...selection[name], selected: true, expanded: true };
                    });
                  } else {
                    [
                      item.name,
                      ...streams
                        .filter(({ name }) => isDescendantOf(item.name, name))
                        .map(({ name }) => name),
                    ].forEach((name) => {
                      selection[name] = { ...selection[name], selected: false };
                    });

                    getAncestors(item.name).forEach((ancestor) => {
                      const hasSelectedChild = streams.some(
                        ({ name }) => isDescendantOf(ancestor, name) && selection[name].selected
                      );
                      selection[ancestor] = {
                        ...selection[ancestor],
                        selected: hasSelectedChild,
                      };
                    });
                  }

                  setRows(selection);
                  onSelectionChange(selection);
                }}
              />
            </EuiFlexGroup>

            {index === sortedRows.length - 1 ? null : <EuiSpacer size="s" />}
          </div>
        );
      })}
    </EuiPanel>
  );
}

function allDescendantsSelected(parent: string, rows: Record<string, StreamRow>) {
  return Object.values(rows)
    .filter(({ name }) => isDescendantOf(parent, name))
    .every(({ selected }) => selected);
}
