/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiSearchBar } from '@elastic/eui';
import { groupBy, intersectionBy, keyBy, sumBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';

import { getActionMode, toSingleModeSelection } from './application_connections_filters';
import { useApplicationConnectionsTableSearch } from './application_connections_table_search';
import { ConnectionsByClientTable } from './connections_by_client_table';
import { ConnectionsListTable } from './connections_list_table';
import { labels } from '../constants/i18n';
import type {
  ApplicationConnection,
  ApplicationConnectionsActionMode,
  ApplicationConnectionTarget,
} from '../constants/types';
import { useApplicationConnectionsActions } from '../context/application_connections_provider';
import { useApplicationConnections } from '../hooks/use_application_connections';
import type { OAuthConnection } from '../service/application_connections_api_client';

export const ApplicationConnectionsTable = () => {
  const [selectedByClient, setSelectedByClient] = useState<Record<string, OAuthConnection[]>>({});

  const { applicationConnections, isLoading } = useApplicationConnections();
  const { revokeConnections, deleteConnections } = useApplicationConnectionsActions();

  const totalConnections = useMemo(
    () =>
      sumBy(
        applicationConnections,
        (applicationConnection) => applicationConnection.connections.length
      ),
    [applicationConnections]
  );

  const clientById = useMemo(
    () => keyBy(applicationConnections, (applicationConnection) => applicationConnection.client.id),
    [applicationConnections]
  );

  const normalizeSelection = useCallback(
    (selectionByClient: Record<string, OAuthConnection[]>) => {
      const selection = Object.entries(selectionByClient).flatMap(([clientId, connections]) => {
        const client = clientById[clientId]?.client;
        return client ? connections.map((connection) => ({ client, connection })) : [];
      });
      const singleMode = toSingleModeSelection(selection, 'revoke');
      if (singleMode.length === selection.length) {
        return selectionByClient;
      }
      return groupBy(
        singleMode.map(({ connection }) => connection),
        'client_id'
      );
    },
    [clientById]
  );

  const handleClientSelectionChange = useCallback(
    (clientId: string, selection: OAuthConnection[]) => {
      setSelectedByClient((previousSelection) => {
        const nextSelection = { ...previousSelection };
        if (selection.length === 0) {
          delete nextSelection[clientId];
        } else {
          nextSelection[clientId] = selection;
        }
        return normalizeSelection(nextSelection);
      });
    },
    [normalizeSelection]
  );

  const handleListSelectionChange = useCallback(
    (selection: OAuthConnection[]) => {
      setSelectedByClient(normalizeSelection(groupBy(selection, 'client_id')));
    },
    [normalizeSelection]
  );

  const activeConnections = useMemo(
    () => applicationConnections.flatMap((connection) => connection.connections),
    [applicationConnections]
  );

  const selectedConnections = useMemo(
    () =>
      intersectionBy(
        Object.values(selectedByClient).flat(),
        activeConnections,
        (connection) => `${connection.client_id}/${connection.id}`
      ),
    [selectedByClient, activeConnections]
  );

  const selectedApplicationConnections = useMemo<ApplicationConnection[]>(
    () =>
      selectedConnections.flatMap((connection) => {
        const client = clientById[connection.client_id]?.client;
        return client ? [{ client, connection }] : [];
      }),
    [selectedConnections, clientById]
  );

  // Derive the action mode from the first selection
  const actionMode = useMemo<ApplicationConnectionsActionMode | null>(
    () =>
      selectedApplicationConnections.length > 0
        ? getActionMode(selectedApplicationConnections[0])
        : null,
    [selectedApplicationConnections]
  );

  const handleActionSettled = useCallback(
    (affectedConnections: ApplicationConnectionTarget[]) => {
      const affectedByClient = groupBy(affectedConnections, 'clientId');

      setSelectedByClient((previousSelection) =>
        Object.entries(previousSelection).reduce<Record<string, OAuthConnection[]>>(
          (selectionsByClient, [clientId, prevSelections]) => {
            const affectedIds = new Set(
              (affectedByClient[clientId] ?? []).map(({ connectionId }) => connectionId)
            );
            const remaining =
              affectedIds.size === 0
                ? prevSelections
                : prevSelections.filter((connection) => !affectedIds.has(connection.id));
            if (remaining.length > 0) {
              selectionsByClient[clientId] = remaining;
            }
            return selectionsByClient;
          },
          {}
        )
      );
    },
    [setSelectedByClient]
  );

  const handleBulkAction = useCallback(() => {
    if (actionMode === null) return;
    const modalConnections = selectedApplicationConnections.map(({ client, connection }) => ({
      client,
      connectionId: connection.id,
      connectionName: connection.name,
      userId: connection.user_id,
      user: connection.user,
    }));
    const runAction = actionMode === 'revoke' ? revokeConnections : deleteConnections;
    runAction(modalConnections, { onSettled: handleActionSettled });
  }, [
    actionMode,
    selectedApplicationConnections,
    revokeConnections,
    deleteConnections,
    handleActionSettled,
  ]);

  const bulkActionButton = useMemo(() => {
    if (actionMode === null) return undefined;
    const count = selectedApplicationConnections.length;
    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={handleBulkAction}
        data-test-subj={
          actionMode === 'revoke'
            ? 'applicationConnectionsBulkRevokeButton'
            : 'applicationConnectionsBulkDeleteButton'
        }
      >
        {actionMode === 'revoke' ? labels.bulkRevokeButton(count) : labels.bulkDeleteButton(count)}
      </EuiButton>
    );
  }, [actionMode, selectedApplicationConnections.length, handleBulkAction]);

  const { searchConfig, viewMode, results } = useApplicationConnectionsTableSearch({
    toolsLeft: bulkActionButton,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="applicationConnectionsTable">
      <EuiSearchBar {...searchConfig} />
      {viewMode === 'grouped' ? (
        <ConnectionsByClientTable
          connections={results}
          totalCount={applicationConnections.length}
          isLoading={isLoading}
          selectedByClient={selectedByClient}
          actionMode={actionMode}
          onSelectionChange={handleClientSelectionChange}
        />
      ) : (
        <ConnectionsListTable
          connections={results}
          totalCount={totalConnections}
          isLoading={isLoading}
          selectedConnections={selectedConnections}
          actionMode={actionMode}
          onSelectionChange={handleListSelectionChange}
        />
      )}
    </EuiFlexGroup>
  );
};
