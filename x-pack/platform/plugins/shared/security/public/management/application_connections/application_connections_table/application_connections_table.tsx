/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiSearchBar } from '@elastic/eui';
import { groupBy, intersectionBy, keyBy, sumBy } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import useMap from 'react-use/lib/useMap';

import { useApplicationConnectionsTableSearch } from './application_connections_table_search';
import { ConnectionsByClientTable } from './connections_by_client_table';
import { ConnectionsListTable } from './connections_list_table';
import { labels } from '../constants/i18n';
import type { RevokedApplicationConnection } from '../constants/types';
import { useApplicationConnectionsActions } from '../context/application_connections_provider';
import { useApplicationConnections } from '../hooks/use_application_connections';
import type { OAuthConnection } from '../service/application_connections_api_client';

export const ApplicationConnectionsTable = () => {
  const [
    selectedByClient,
    { set: setClientSelection, remove: removeClientSelection, setAll: setSelectedByClient },
  ] = useMap<Record<string, OAuthConnection[]>>({});

  const { applicationConnections, isLoading } = useApplicationConnections();
  const { revokeConnections } = useApplicationConnectionsActions();

  const totalConnections = useMemo(
    () =>
      sumBy(
        applicationConnections,
        (applicationConnection) => applicationConnection.connections.length
      ),
    [applicationConnections]
  );

  const handleClientSelectionChange = useCallback(
    (clientId: string, selection: OAuthConnection[]) => {
      if (selection.length === 0) {
        removeClientSelection(clientId);
      } else {
        setClientSelection(clientId, selection);
      }
    },
    [setClientSelection, removeClientSelection]
  );

  const handleListSelectionChange = useCallback(
    (selection: OAuthConnection[]) => {
      setSelectedByClient(groupBy(selection, 'client_id'));
    },
    [setSelectedByClient]
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

  const handleRevoked = useCallback(
    (revokedConnections: RevokedApplicationConnection[]) => {
      const revokedByClient = groupBy(revokedConnections, 'clientId');

      const nextSelectedByClient = Object.entries(selectedByClient).reduce<
        Record<string, OAuthConnection[]>
      >((selectionsByClient, [clientId, prevSelections]) => {
        const revokedIds = new Set(
          (revokedByClient[clientId] ?? []).map(({ connectionId }) => connectionId)
        );
        const remaining =
          revokedIds.size === 0
            ? prevSelections
            : prevSelections.filter((connection) => !revokedIds.has(connection.id));
        if (remaining.length > 0) {
          selectionsByClient[clientId] = remaining;
        }
        return selectionsByClient;
      }, {});

      setSelectedByClient(nextSelectedByClient);
    },
    [selectedByClient, setSelectedByClient]
  );

  const handleBulkRevoke = useCallback(() => {
    if (selectedConnections.length === 0) return;
    const clientById = keyBy(applicationConnections, (connection) => connection.client.id);
    revokeConnections(
      selectedConnections.flatMap((connection) => {
        const client = clientById[connection.client_id]?.client;
        if (!client) return [];
        return [
          {
            client,
            connectionId: connection.id,
            connectionName: connection.name,
            userId: connection.user_id,
            user: connection.user,
          },
        ];
      }),
      { onRevoked: handleRevoked }
    );
  }, [applicationConnections, revokeConnections, selectedConnections, handleRevoked]);

  const bulkRevokeButton = useMemo(
    () =>
      selectedConnections.length > 0 ? (
        <EuiButton
          color="danger"
          iconType="trash"
          onClick={handleBulkRevoke}
          data-test-subj="applicationConnectionsBulkRevokeButton"
        >
          {labels.bulkRevokeButton(selectedConnections.length)}
        </EuiButton>
      ) : undefined,
    [selectedConnections.length, handleBulkRevoke]
  );

  const { searchConfig, viewMode, results } = useApplicationConnectionsTableSearch({
    toolsLeft: bulkRevokeButton,
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
          onSelectionChange={handleClientSelectionChange}
        />
      ) : (
        <ConnectionsListTable
          connections={results}
          totalCount={totalConnections}
          isLoading={isLoading}
          selectedConnections={selectedConnections}
          onSelectionChange={handleListSelectionChange}
        />
      )}
    </EuiFlexGroup>
  );
};
