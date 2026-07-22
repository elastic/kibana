/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatMap } from 'lodash';

import type {
  ApplicationConnection,
  ApplicationConnections,
  ApplicationConnectionStatusFilter,
} from '../constants/types';

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
  const isActive =
    !applicationConnection.client.revoked && !applicationConnection.connection.revoked;
  return (
    (statuses.includes('connected') && isActive) || (statuses.includes('revoked') && !isActive)
  );
};
