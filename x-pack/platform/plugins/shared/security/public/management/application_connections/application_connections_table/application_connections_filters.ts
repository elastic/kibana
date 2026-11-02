/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap } from 'lodash';

import { labels } from '../constants/i18n';
import type {
  ApplicationConnection,
  ApplicationConnections,
  ApplicationConnectionsActionMode,
  ApplicationConnectionStatusFilter,
} from '../constants/types';

export const getConnectionStatus = ({
  client,
  connection,
}: ApplicationConnection): ApplicationConnectionStatusFilter => {
  if (client.revoked || connection.revoked) return 'revoked';
  if (connection.expired) return 'expired';
  return 'connected';
};

export const isRevocable = (applicationConnection: ApplicationConnection): boolean =>
  getConnectionStatus(applicationConnection) !== 'revoked';

export const isDeletable = (applicationConnection: ApplicationConnection): boolean =>
  !isRevocable(applicationConnection);

export const getActionMode = (
  applicationConnection: ApplicationConnection
): ApplicationConnectionsActionMode => (isRevocable(applicationConnection) ? 'revoke' : 'delete');

export const matchesActionMode = (
  applicationConnection: ApplicationConnection,
  mode: ApplicationConnectionsActionMode | null
): boolean => mode === null || getActionMode(applicationConnection) === mode;

export const toSingleModeSelection = (
  applicationConnections: ApplicationConnection[],
  preferredMode: ApplicationConnectionsActionMode
): ApplicationConnection[] => {
  const preferred = applicationConnections.filter((applicationConnection) =>
    matchesActionMode(applicationConnection, preferredMode)
  );
  return preferred.length > 0 ? preferred : applicationConnections;
};

export const getUnselectableRowMessage = (applicationConnection: ApplicationConnection): string =>
  isDeletable(applicationConnection)
    ? labels.connectionColumns.deletableRowNotSelectableLabel
    : labels.connectionColumns.revocableRowNotSelectableLabel;

export const toApplicationConnectionList = (
  connections: ApplicationConnections[]
): ApplicationConnection[] =>
  flatMap(connections, (applicationConnection) =>
    applicationConnection.connections.map((connection) => ({
      client: applicationConnection.client,
      connection,
    }))
  );

const lowercaseFields = (values: Array<string | undefined>): string[] =>
  values.filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());

export const applicationConnectionsMatchesFreeText = (
  applicationConnections: ApplicationConnections,
  query: string
): boolean => {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const { client, connections } = applicationConnections;
  const normalizedClientFields = lowercaseFields([client.client_name, client.id, client.resource]);
  if (normalizedClientFields.some((field) => field.includes(normalizedQuery))) return true;
  return connections.some((connection) => {
    const normalizedConnectionFields = lowercaseFields([connection.name, connection.id]);
    return normalizedConnectionFields.some((field) => field.includes(normalizedQuery));
  });
};

export const applicationConnectionMatchesFreeText = (
  applicationConnection: ApplicationConnection,
  query: string
): boolean => {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const { client, connection } = applicationConnection;
  const normalizedFields = lowercaseFields([
    connection.name,
    connection.id,
    client.client_name,
    client.id,
    client.resource,
  ]);
  return normalizedFields.some((field) => field.includes(normalizedQuery));
};

export const applicationConnectionMatchesStatus = (
  applicationConnection: ApplicationConnection,
  statuses: ApplicationConnectionStatusFilter[]
): boolean => {
  if (statuses.length === 0) return true;
  return statuses.includes(getConnectionStatus(applicationConnection));
};
