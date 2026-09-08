/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertHistoryEsIndexConnectorId } from '@kbn/actions-plugin/common';
import { preconfiguredConnectorSource } from './connector_sources';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';

const mockRequest = {} as KibanaRequest;

const makeInMemory = (overrides: Partial<InMemoryConnector> = {}): InMemoryConnector => ({
  id: 'connector-1',
  name: 'My Connector',
  actionTypeId: '.github',
  isPreconfigured: true,
  isSystemAction: false,
  isDeprecated: false,
  isConnectorTypeDeprecated: false,
  config: { url: 'https://github.example.com' },
  secrets: { token: 'ghp_secret' },
  ...overrides,
});

const makeActionsStart = (connectors: InMemoryConnector[]): ActionsPluginStart => {
  return {
    inMemoryConnectors: connectors,
  } as unknown as ActionsPluginStart;
};

const makeActionsClient = (authorizedIds: string[]): PublicMethodsOf<ActionsClient> => {
  return {
    getAll: jest
      .fn()
      .mockResolvedValue(
        authorizedIds.map((id) => ({ id, name: `Connector ${id}`, actionTypeId: '.github' }))
      ),
  } as unknown as PublicMethodsOf<ActionsClient>;
};

describe('preconfiguredConnectorSource', () => {
  it('returns [] when actions plugin is absent', async () => {
    const source = preconfiguredConnectorSource(() => undefined, jest.fn());
    const result = await source(mockRequest);
    expect(result).toEqual([]);
  });

  it('returns [] when no connectors pass the authorization gate', async () => {
    const connector = makeInMemory({ id: 'connector-1' });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([connector]),
      async () => makeActionsClient([]) // getAll returns nothing authorized
    );
    const result = await source(mockRequest);
    expect(result).toEqual([]);
  });

  it('returns only connectors that appear in both inMemoryConnectors and getAll()', async () => {
    const allowed = makeInMemory({ id: 'allowed' });
    const notAllowed = makeInMemory({ id: 'not-allowed' });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([allowed, notAllowed]),
      async () => makeActionsClient(['allowed'])
    );
    const result = await source(mockRequest);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('allowed');
  });

  it('excludes connectors with isDynamic: true', async () => {
    const dynamic = makeInMemory({ id: 'dynamic', isDynamic: true });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([dynamic]),
      async () => makeActionsClient(['dynamic'])
    );
    const result = await source(mockRequest);
    expect(result).toEqual([]);
  });

  it('excludes connectors with isSystemAction: true', async () => {
    const system = makeInMemory({ id: 'system', isSystemAction: true });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([system]),
      async () => makeActionsClient(['system'])
    );
    const result = await source(mockRequest);
    expect(result).toEqual([]);
  });

  it('excludes the AlertHistoryEsIndexConnectorId connector', async () => {
    const alertHistory = makeInMemory({ id: AlertHistoryEsIndexConnectorId });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([alertHistory]),
      async () => makeActionsClient([AlertHistoryEsIndexConnectorId])
    );
    const result = await source(mockRequest);
    expect(result).toEqual([]);
  });

  it('re-reads inMemoryConnectors on every call (not snapshotted at construction)', async () => {
    const connectors: InMemoryConnector[] = [];
    const source = preconfiguredConnectorSource(
      () => makeActionsStart(connectors),
      async (req) => makeActionsClient(connectors.map((c) => c.id))
    );

    // First call: empty
    const first = await source(mockRequest);
    expect(first).toHaveLength(0);

    // Mutate the live array between calls
    connectors.push(makeInMemory({ id: 'newly-added' }));

    // Second call: should see the new entry
    const second = await source(mockRequest);
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe('newly-added');
  });

  it('returns connector secrets in the result', async () => {
    const connector = makeInMemory({ id: 'c1', secrets: { apiToken: 'my-secret' } });
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([connector]),
      async () => makeActionsClient(['c1'])
    );
    const result = await source(mockRequest);
    expect(result[0].secrets).toEqual({ apiToken: 'my-secret' });
  });

  it('calls getActionsClient with the incoming request', async () => {
    const connector = makeInMemory({ id: 'c1' });
    const getActionsClient = jest.fn().mockResolvedValue(makeActionsClient(['c1']));
    const source = preconfiguredConnectorSource(
      () => makeActionsStart([connector]),
      getActionsClient
    );
    await source(mockRequest);
    expect(getActionsClient).toHaveBeenCalledWith(mockRequest);
  });
});
