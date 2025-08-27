/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  ConflictResolution,
  PropertyAdded,
  PropertyRemoved,
  StreamChanges,
  StreamConflict,
  isAddChange,
  isRemoveChange,
  isRoutingChange,
} from '@kbn/content-packs-schema';
import { getSegments, isChildOf, isDescendantOf } from '@kbn/streams-schema';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChangesTable, ConflictsTable } from './conflict';

export function Diff({
  changes,
  conflicts,
  resolutions,
  setResolutions,
}: {
  changes: StreamChanges[];
  conflicts: StreamConflict[];
  resolutions: ConflictResolution[];
  setResolutions: (resolutions: ConflictResolution[]) => void;
}) {
  const sorted = changes.sort((a, b) => a.name.localeCompare(b.name));
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
          ancestor.changes
            .filter(
              (change): change is PropertyRemoved<'routing'> =>
                isRoutingChange(change) && isRemoveChange(change)
            )
            .find((change) => {
              return (
                change.value.destination === row.name ||
                isDescendantOf(change.value.destination, row.name)
              );
            })
        );
        const wasAdded = ancestors.some((ancestor) =>
          ancestor.changes
            .filter(
              (change): change is PropertyAdded<'routing'> =>
                isRoutingChange(change) && isAddChange(change)
            )
            .find((change) => {
              return (
                isRoutingChange(change) &&
                (change.value.destination === row.name ||
                  isDescendantOf(change.value.destination, row.name))
              );
            })
        );
        const wasUpdated = row.changes.length > 0;
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
              <EuiText size="xs" color={color}>
                {row.name}
              </EuiText>
            ) : (
              <EuiAccordion
                id={row.name}
                buttonContent={
                  <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color={color}>
                        {row.name}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText color="subdued" size="xs">
                        {i18n.translate('xpack.streams.contentDiff.details', {
                          defaultMessage: 'details',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    {streamConflicts ? (
                      <EuiFlexItem>
                        <EuiIcon type="warningFilled" color="danger" />
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                }
                arrowDisplay="none"
              >
                <EuiPanel color="subdued">
                  {streamConflicts ? (
                    <ConflictsTable
                      stream={row.name}
                      conflicts={streamConflicts.conflicts}
                      resolutions={resolutions}
                      setResolutions={setResolutions}
                    />
                  ) : null}

                  {changes.length > 0 ? <ChangesTable changes={row.changes} /> : null}
                </EuiPanel>
              </EuiAccordion>
            )}
          </EuiFlexGroup>
        );
      })}
    </>
  );
}
