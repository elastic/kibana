/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  ConflictResolution,
  PropertyAdded,
  PropertyChange,
  PropertyConflict,
  PropertyRemoved,
  PropertyUpdated,
  isAddChange,
  isRemoveChange,
  isUpdateChange,
} from '@kbn/content-packs-schema';
import { RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { capitalize, sortBy } from 'lodash';
import { Resolve } from './resolve';

export function ConflictsTable({
  stream,
  conflicts,
  resolutions,
  setResolutions,
}: {
  stream: string;
  conflicts: PropertyConflict[];
  resolutions: ConflictResolution[];
  setResolutions: (resolutions: ConflictResolution[]) => void;
}) {
  const [resolvingConflict, setResolvingConflict] = useState<PropertyConflict | undefined>(
    undefined
  );
  const [currentResolution, setCurrentResolution] = useState<ConflictResolution | undefined>(
    undefined
  );

  return (
    <>
      {resolvingConflict ? (
        <EuiConfirmModal
          title="Conflict resolution"
          onCancel={() => setResolvingConflict(undefined)}
          confirmButtonDisabled={!currentResolution}
          onConfirm={() => {
            if (!currentResolution) {
              return;
            }

            const updatedResolutions = resolutions.filter((res) => res.id !== resolvingConflict.id);
            setResolutions([...updatedResolutions, currentResolution]);
            setResolvingConflict(undefined);
            setCurrentResolution(undefined);
          }}
          cancelButtonText="Cancel"
          confirmButtonText="Resolve"
          buttonColor="primary"
          defaultFocusedButton="confirm"
        >
          <Resolve
            conflict={resolvingConflict}
            resolution={currentResolution}
            onResolution={(value) => {
              setCurrentResolution({
                id: resolvingConflict.id,
                type: resolvingConflict.type,
                stream,
                value,
              });
            }}
          />
        </EuiConfirmModal>
      ) : null}

      <EuiText size="s">
        <b>Conflicts</b>
      </EuiText>

      <EuiBasicTable
        compressed
        items={conflicts}
        columns={[
          {
            render: (conflict: PropertyConflict) => {
              if (resolutions.find((res) => res.id === conflict.id)) {
                return <EuiIcon type="checkCircle" />;
              }
            },
          },
          { field: 'type', name: 'Property type', render: capitalize },
          { field: 'id', name: 'Identifier' },
          {
            render: (conflict: PropertyConflict) => {
              return (
                <EuiButtonEmpty
                  size="xs"
                  flush="left"
                  onClick={() => {
                    setResolvingConflict(conflict);
                    setCurrentResolution(resolutions.find((res) => res.id === conflict.id));
                  }}
                >
                  Resolve
                </EuiButtonEmpty>
              );
            },
          },
        ]}
      />

      <EuiSpacer />
    </>
  );
}

export function ChangesTable({ changes }: { changes: PropertyChange[] }) {
  const { added, removed, updated } = useMemo(
    () => ({
      added: sortBy(changes.filter(isAddChange), ({ type }) => type),
      removed: sortBy(changes.filter(isRemoveChange), ({ type }) => type),
      updated: sortBy(changes.filter(isUpdateChange), ({ type }) => type),
    }),
    [changes]
  );

  return (
    <>
      {added.length > 0 ? (
        <>
          <EuiText size="s">
            <b>Added</b>
          </EuiText>

          <EuiBasicTable
            compressed
            items={added}
            columns={[
              { field: 'type', name: 'Type', render: capitalize },
              {
                name: 'Identifier',
                render: (change: PropertyAdded) => {
                  return getPropertyLabel(change);
                },
              },
            ]}
          />

          <EuiSpacer />
        </>
      ) : null}

      {removed.length > 0 ? (
        <>
          <EuiText size="s">
            <b>Removed</b>
          </EuiText>
          <EuiBasicTable
            compressed
            items={removed}
            columns={[
              { field: 'type', name: 'Type', render: capitalize },
              {
                name: 'Identifier',
                render: (change: PropertyRemoved) => {
                  return getPropertyLabel(change);
                },
              },
            ]}
          />

          <EuiSpacer />
        </>
      ) : null}

      {updated.length > 0 ? (
        <>
          <EuiText size="s">
            <b>Updated</b>
          </EuiText>

          <EuiBasicTable
            compressed
            items={updated}
            columns={[
              { field: 'type', name: 'Type', render: capitalize },
              {
                name: 'Identifier',
                render: (change: PropertyUpdated) => {
                  return getPropertyLabel({
                    operation: 'add',
                    type: change.type,
                    value: change.value.from,
                  });
                },
              },
            ]}
          />

          <EuiSpacer />
        </>
      ) : null}
    </>
  );
}

function getPropertyLabel(change: PropertyAdded | PropertyRemoved) {
  if (change.type === 'field') {
    return Object.keys(change.value)[0];
  } else if (change.type === 'query') {
    return (change.value as StreamQuery).title;
  } else if (change.type === 'routing') {
    return (change.value as RoutingDefinition).destination;
  }
}
