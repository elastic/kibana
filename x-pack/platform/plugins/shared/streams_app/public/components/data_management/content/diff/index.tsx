/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { StreamConflict, StreamDiff, isRoutingChange } from '@kbn/content-packs-schema';
import { getSegments, isChildOf, isDescendantOf } from '@kbn/streams-schema';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Conflict } from './conflict';

type StreamRow = StreamDiff & {
  level: number;
  isParent: boolean;
};

export function Diff({ diffs, conflicts }: { diffs: StreamDiff[]; conflicts: StreamConflict[] }) {
  const sorted = diffs.sort((a, b) => a.name.localeCompare(b.name));
  const rows = sorted.map((entry, index) => {
    const next = sorted[index + 1];
    return {
      ...entry,
      level: getSegments(entry.name).length - 1,
      isParent: next ? isChildOf(entry.name, next.name) : false,
    };
  });

  return (
    <>
      {rows.map((row) => {
        const ancestors = rows.filter(({ name }) => isDescendantOf(name, row.name));
        const wasRemoved = ancestors.some((ancestor) =>
          ancestor.diff.removed.find((change) => {
            return (
              isRoutingChange(change) &&
              (change.value.from.destination === row.name ||
                isDescendantOf(change.value.from.destination, row.name))
            );
          })
        );
        const wasAdded = ancestors.some((ancestor) =>
          ancestor.diff.added.find((change) => {
            return (
              isRoutingChange(change) &&
              (change.value.to.destination === row.name ||
                isDescendantOf(change.value.to.destination, row.name))
            );
          })
        );
        const wasUpdated =
          row.diff.added.length > 0 || row.diff.removed.length > 0 || row.diff.updated.length > 0;
        const streamConflicts = conflicts.find(({ name }) => name === row.name);
        const color = wasRemoved
          ? 'danger'
          : wasAdded
          ? 'success'
          : wasUpdated
          ? 'warning'
          : 'default';

        const hasChanges = wasUpdated || !!streamConflicts;

        return (
          <EuiFlexGroup key={row.name} style={{ marginLeft: `${row.level * 16}px` }}>
            {!hasChanges ? (
              <EuiText color={color}>{row.name}</EuiText>
            ) : (
              <EuiAccordion
                id={row.name}
                buttonContent={
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    <EuiFlexGroup direction="row" alignItems="center">
                      <EuiText color={color}>{row.name}</EuiText>
                      {streamConflicts ? <EuiIcon type="warningFilled" color="danger" /> : null}
                    </EuiFlexGroup>

                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="xs">
                        {i18n.translate('xpack.streams.contentDiff.details', {
                          defaultMessage: 'details',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                arrowDisplay="none"
              >
                <EuiPanel color="subdued">
                  <EuiText size="s" color={color}>
                    {streamConflicts ? (
                      <>
                        <EuiFlexItem>Conflicts</EuiFlexItem>
                        {streamConflicts.conflicts.map((conflict) => {
                          return (
                            <EuiFlexGroup>
                              <Conflict conflict={conflict} />;
                            </EuiFlexGroup>
                          );
                        })}
                      </>
                    ) : null}

                    {Object.entries(row.diff)
                      .filter(([, values]) => values.length)
                      .map(([key, values]) => (
                        <>
                          <EuiText>{capitalize(key)}</EuiText>
                          <>
                            {values.map((op) => (
                              <EuiText
                                color={
                                  key === 'added'
                                    ? 'success'
                                    : key === 'removed'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {JSON.stringify(op)}
                              </EuiText>
                            ))}
                          </>
                        </>
                      ))}
                  </EuiText>
                </EuiPanel>
              </EuiAccordion>
            )}
          </EuiFlexGroup>
        );
      })}
    </>
  );
}
