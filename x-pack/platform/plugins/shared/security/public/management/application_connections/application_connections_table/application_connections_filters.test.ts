/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applicationConnectionMatchesFreeText,
  applicationConnectionMatchesStatus,
  applicationConnectionsMatchesFreeText,
  getConnectionStatus,
  isRevocable,
  toApplicationConnectionList,
} from './application_connections_filters';
import type { ApplicationConnection, ApplicationConnections } from '../constants/types';
import type { OAuthClient, OAuthConnection } from '../service/application_connections_api_client';

const createClient = (overrides: Partial<OAuthClient> = {}): OAuthClient => ({
  id: 'client-1',
  client_name: 'My MCP app',
  resource: 'cluster:elastic',
  ...overrides,
});

const createConnection = (overrides: Partial<OAuthConnection> = {}): OAuthConnection => ({
  id: 'conn-1',
  client_id: 'client-1',
  name: 'Laptop session',
  resource: 'cluster:elastic',
  ...overrides,
});

const createApplicationConnections = (
  overrides: Partial<ApplicationConnections> = {}
): ApplicationConnections => ({
  client: createClient(),
  connections: [createConnection()],
  ...overrides,
});

const createApplicationConnection = (
  overrides: Partial<ApplicationConnection> = {}
): ApplicationConnection => ({
  client: createClient(),
  connection: createConnection(),
  ...overrides,
});

describe('#toApplicationConnectionList', () => {
  it('returns an empty array when given no clients', () => {
    expect(toApplicationConnectionList([])).toEqual([]);
  });

  it('flattens each client with each of its connections into a row', () => {
    const clientA = createClient({ id: 'client-a' });
    const clientB = createClient({ id: 'client-b' });
    const connA1 = createConnection({ id: 'conn-a1', client_id: 'client-a' });
    const connA2 = createConnection({ id: 'conn-a2', client_id: 'client-a' });
    const connB1 = createConnection({ id: 'conn-b1', client_id: 'client-b' });

    const result = toApplicationConnectionList([
      { client: clientA, connections: [connA1, connA2] },
      { client: clientB, connections: [connB1] },
    ]);

    expect(result).toEqual([
      { client: clientA, connection: connA1 },
      { client: clientA, connection: connA2 },
      { client: clientB, connection: connB1 },
    ]);
  });

  it('omits clients that have no connections', () => {
    const clientA = createClient({ id: 'client-a' });
    const clientB = createClient({ id: 'client-b' });
    const connB1 = createConnection({ id: 'conn-b1', client_id: 'client-b' });

    const result = toApplicationConnectionList([
      { client: clientA, connections: [] },
      { client: clientB, connections: [connB1] },
    ]);

    expect(result).toEqual([{ client: clientB, connection: connB1 }]);
  });
});

describe('#applicationConnectionsMatchesFreeText', () => {
  const row = createApplicationConnections({
    client: createClient({
      id: 'client-abc',
      client_name: 'Acme MCP',
      resource: 'cluster:elastic-prod',
    }),
    connections: [
      createConnection({ id: 'conn-xyz', client_id: 'client-abc', name: 'Laptop session' }),
      createConnection({ id: 'conn-pqr', client_id: 'client-abc', name: 'Phone session' }),
    ],
  });

  it('returns true when the query is empty', () => {
    expect(applicationConnectionsMatchesFreeText(row, '')).toBe(true);
  });

  it('matches against client.client_name case-insensitively', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'acme')).toBe(true);
    expect(applicationConnectionsMatchesFreeText(row, 'ACME')).toBe(true);
  });

  it('matches against client.id', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'client-abc')).toBe(true);
  });

  it('matches against client.resource', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'elastic-prod')).toBe(true);
  });

  it('matches against any nested connection.name', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'phone')).toBe(true);
    expect(applicationConnectionsMatchesFreeText(row, 'laptop')).toBe(true);
  });

  it('matches against any nested connection.id', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'conn-xyz')).toBe(true);
    expect(applicationConnectionsMatchesFreeText(row, 'conn-pqr')).toBe(true);
  });

  it('returns false when no field contains the query', () => {
    expect(applicationConnectionsMatchesFreeText(row, 'something-unrelated')).toBe(false);
  });

  it('ignores undefined optional fields when matching', () => {
    const sparse = createApplicationConnections({
      client: createClient({ client_name: undefined }),
      connections: [
        createConnection({ id: 'conn-1', name: undefined }),
        createConnection({ id: 'conn-2', name: 'Phone session' }),
      ],
    });
    expect(applicationConnectionsMatchesFreeText(sparse, 'phone')).toBe(true);
    expect(applicationConnectionsMatchesFreeText(sparse, 'my mcp app')).toBe(false);
  });
});

describe('#applicationConnectionMatchesFreeText', () => {
  const row = createApplicationConnection({
    client: createClient({
      id: 'client-abc',
      client_name: 'Acme MCP',
      resource: 'cluster:elastic-prod',
    }),
    connection: createConnection({
      id: 'conn-xyz',
      client_id: 'client-abc',
      name: 'Laptop session',
    }),
  });

  it('returns true when the query is empty', () => {
    expect(applicationConnectionMatchesFreeText(row, '')).toBe(true);
  });

  it('matches against client.client_name case-insensitively', () => {
    expect(applicationConnectionMatchesFreeText(row, 'acme')).toBe(true);
    expect(applicationConnectionMatchesFreeText(row, 'ACME')).toBe(true);
  });

  it('matches against client.id', () => {
    expect(applicationConnectionMatchesFreeText(row, 'client-abc')).toBe(true);
  });

  it('matches against client.resource', () => {
    expect(applicationConnectionMatchesFreeText(row, 'elastic-prod')).toBe(true);
  });

  it('matches against connection.name', () => {
    expect(applicationConnectionMatchesFreeText(row, 'laptop')).toBe(true);
  });

  it('matches against connection.id', () => {
    expect(applicationConnectionMatchesFreeText(row, 'conn-xyz')).toBe(true);
  });

  it('returns false when no field contains the query', () => {
    expect(applicationConnectionMatchesFreeText(row, 'something-unrelated')).toBe(false);
  });

  it('ignores undefined optional fields when matching', () => {
    const sparse = createApplicationConnection({
      client: createClient({ client_name: undefined }),
      connection: createConnection({ name: undefined }),
    });
    expect(applicationConnectionMatchesFreeText(sparse, 'client-1')).toBe(true);
    expect(applicationConnectionMatchesFreeText(sparse, 'my mcp app')).toBe(false);
    expect(applicationConnectionMatchesFreeText(sparse, 'laptop')).toBe(false);
  });
});

describe('#applicationConnectionMatchesStatus', () => {
  const active = createApplicationConnection({
    client: createClient({ revoked: false }),
    connection: createConnection({ revoked: false }),
  });
  const clientRevoked = createApplicationConnection({
    client: createClient({ revoked: true }),
    connection: createConnection({ revoked: false }),
  });
  const connectionRevoked = createApplicationConnection({
    client: createClient({ revoked: false }),
    connection: createConnection({ revoked: true }),
  });
  const expired = createApplicationConnection({
    client: createClient({ revoked: false }),
    connection: createConnection({ revoked: false, expired: true }),
  });
  const expiredAndRevoked = createApplicationConnection({
    client: createClient({ revoked: false }),
    connection: createConnection({ revoked: true, expired: true }),
  });

  it('returns true for any row when the filter list is empty', () => {
    expect(applicationConnectionMatchesStatus(active, [])).toBe(true);
    expect(applicationConnectionMatchesStatus(clientRevoked, [])).toBe(true);
    expect(applicationConnectionMatchesStatus(expired, [])).toBe(true);
  });

  describe('with status: ["connected"]', () => {
    it('matches rows where neither client nor connection is revoked and not expired', () => {
      expect(applicationConnectionMatchesStatus(active, ['connected'])).toBe(true);
    });

    it('does not match when the client is revoked', () => {
      expect(applicationConnectionMatchesStatus(clientRevoked, ['connected'])).toBe(false);
    });

    it('does not match when the connection is revoked', () => {
      expect(applicationConnectionMatchesStatus(connectionRevoked, ['connected'])).toBe(false);
    });

    it('does not match when the connection is expired', () => {
      expect(applicationConnectionMatchesStatus(expired, ['connected'])).toBe(false);
    });
  });

  describe('with status: ["expired"]', () => {
    it('matches an expired connection', () => {
      expect(applicationConnectionMatchesStatus(expired, ['expired'])).toBe(true);
    });

    it('does not match an active row', () => {
      expect(applicationConnectionMatchesStatus(active, ['expired'])).toBe(false);
    });

    it('does not match a revoked row that is also expired (revoked takes precedence)', () => {
      expect(applicationConnectionMatchesStatus(expiredAndRevoked, ['expired'])).toBe(false);
    });
  });

  describe('with status: ["revoked"]', () => {
    it('matches when the client is revoked', () => {
      expect(applicationConnectionMatchesStatus(clientRevoked, ['revoked'])).toBe(true);
    });

    it('matches when the connection is revoked', () => {
      expect(applicationConnectionMatchesStatus(connectionRevoked, ['revoked'])).toBe(true);
    });

    it('matches an expired-and-revoked row (revoked takes precedence)', () => {
      expect(applicationConnectionMatchesStatus(expiredAndRevoked, ['revoked'])).toBe(true);
    });

    it('does not match an active row', () => {
      expect(applicationConnectionMatchesStatus(active, ['revoked'])).toBe(false);
    });

    it('does not match an expired row', () => {
      expect(applicationConnectionMatchesStatus(expired, ['revoked'])).toBe(false);
    });
  });

  describe('with status: ["connected", "expired", "revoked"]', () => {
    it('matches every row (OR semantics)', () => {
      const statuses = ['connected', 'expired', 'revoked'] as const;
      expect(applicationConnectionMatchesStatus(active, [...statuses])).toBe(true);
      expect(applicationConnectionMatchesStatus(clientRevoked, [...statuses])).toBe(true);
      expect(applicationConnectionMatchesStatus(connectionRevoked, [...statuses])).toBe(true);
      expect(applicationConnectionMatchesStatus(expired, [...statuses])).toBe(true);
    });
  });
});

describe('#getConnectionStatus', () => {
  it('returns "connected" when neither client nor connection is revoked or expired', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          client: createClient({ revoked: false }),
          connection: createConnection({ revoked: false, expired: false }),
        })
      )
    ).toBe('connected');
  });

  it('returns "expired" when the connection is expired but not revoked', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          connection: createConnection({ revoked: false, expired: true }),
        })
      )
    ).toBe('expired');
  });

  it('returns "revoked" when the connection is revoked', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          connection: createConnection({ revoked: true }),
        })
      )
    ).toBe('revoked');
  });

  it('returns "revoked" when the client is revoked', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          client: createClient({ revoked: true }),
          connection: createConnection({ revoked: false }),
        })
      )
    ).toBe('revoked');
  });

  it('prefers "revoked" over "expired" when the connection is both revoked and expired', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          connection: createConnection({ revoked: true, expired: true }),
        })
      )
    ).toBe('revoked');
  });

  it('prefers "revoked" over "expired" when the client is revoked and the connection is expired', () => {
    expect(
      getConnectionStatus(
        createApplicationConnection({
          client: createClient({ revoked: true }),
          connection: createConnection({ revoked: false, expired: true }),
        })
      )
    ).toBe('revoked');
  });
});

describe('#isRevocable', () => {
  it('is revocable when neither client nor connection is revoked', () => {
    expect(
      isRevocable(
        createApplicationConnection({
          client: createClient({ revoked: false }),
          connection: createConnection({ revoked: false }),
        })
      )
    ).toBe(true);
  });

  it('stays revocable when the connection is expired but not revoked', () => {
    expect(
      isRevocable(
        createApplicationConnection({
          connection: createConnection({ revoked: false, expired: true }),
        })
      )
    ).toBe(true);
  });

  it('is not revocable when the connection is revoked', () => {
    expect(
      isRevocable(
        createApplicationConnection({
          connection: createConnection({ revoked: true }),
        })
      )
    ).toBe(false);
  });

  it('is not revocable when the client is revoked', () => {
    expect(
      isRevocable(
        createApplicationConnection({
          client: createClient({ revoked: true }),
          connection: createConnection({ revoked: false }),
        })
      )
    ).toBe(false);
  });

  it('is not revocable when the connection is both expired and revoked', () => {
    expect(
      isRevocable(
        createApplicationConnection({
          connection: createConnection({ revoked: true, expired: true }),
        })
      )
    ).toBe(false);
  });
});
