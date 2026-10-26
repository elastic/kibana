/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useDataConnectors } from './use_data_connectors';

const ACTION_CONNECTORS_LIST_PATH = '/api/actions/connectors';
const ACTION_CONNECTOR_TYPES_PATH = '/api/actions/connector_types';

const SUPPORTED_TYPE_IDS = [
  '.google_drive',
  '.one_drive',
  '.notion',
  '.amazon_s3',
  '.github',
  '.box',
  '.dropbox',
  '.google_cloud_storage',
  '.salesforce',
  '.zendesk',
];

interface RawActionConnector {
  id: string;
  name: string;
  connector_type_id: string;
}

const buildRawConnector = (overrides: Partial<RawActionConnector> = {}): RawActionConnector => ({
  id: 'connector-id',
  name: 'Connector Name',
  connector_type_id: '.google_drive',
  ...overrides,
});

const buildRawConnectorType = (id: string) => ({
  id,
  name: `Type ${id}`,
  supported_feature_ids: ['contextEngine'],
});

const buildSupportedTypesResponse = () => SUPPORTED_TYPE_IDS.map(buildRawConnectorType);

const mockHttpGet = (
  core: CoreStart,
  {
    connectors,
    types,
  }: {
    connectors?: unknown | Error;
    types?: unknown | Error;
  }
) => {
  (core.http.get as jest.Mock).mockImplementation((path: string) => {
    if (path === ACTION_CONNECTOR_TYPES_PATH) {
      if (types instanceof Error) return Promise.reject(types);
      return Promise.resolve(types ?? buildSupportedTypesResponse());
    }
    if (path === ACTION_CONNECTORS_LIST_PATH) {
      if (connectors instanceof Error) return Promise.reject(connectors);
      return Promise.resolve(connectors ?? []);
    }
    return Promise.resolve(undefined);
  });
};

const renderDataConnectors = (
  core: CoreStart,
  options?: Parameters<typeof useDataConnectors>[0]
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook(() => useDataConnectors(options), { wrapper });
};

describe('useDataConnectors', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests /api/actions/connector_types with the contextEngine feature id', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, { connectors: [] });
    renderDataConnectors(core);

    await waitFor(() =>
      expect(core.http.get).toHaveBeenCalledWith(
        ACTION_CONNECTOR_TYPES_PATH,
        expect.objectContaining({
          query: { feature_id: 'contextEngine' },
          signal: expect.any(AbortSignal),
        })
      )
    );
  });

  it('requests /api/actions/connectors', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, { connectors: [] });
    renderDataConnectors(core);

    await waitFor(() =>
      expect(core.http.get).toHaveBeenCalledWith(
        ACTION_CONNECTORS_LIST_PATH,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
  });

  it('returns isLoading: true and an empty connectors array before the requests resolve', () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderDataConnectors(core);

    expect(result.current.isLoading).toBe(true);
    expect(result.current.connectors).toEqual([]);
  });

  it('filters out connectors whose connector_type_id is not returned by the connector-types API', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, {
      connectors: [
        buildRawConnector({ id: 'gd-1', name: 'Google Drive', connector_type_id: '.google_drive' }),
        buildRawConnector({ id: 'gh-1', name: 'GitHub', connector_type_id: '.github' }),
        buildRawConnector({ id: 'slack-1', name: 'Slack', connector_type_id: '.slack' }),
        buildRawConnector({ id: 'index-1', name: 'Index', connector_type_id: '.index' }),
        buildRawConnector({ id: 'email-1', name: 'Email', connector_type_id: '.email' }),
      ],
    });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectors).toEqual([
      { id: 'gd-1', name: 'Google Drive', actionTypeId: '.google_drive' },
      { id: 'gh-1', name: 'GitHub', actionTypeId: '.github' },
    ]);
  });

  it('returns every type that the connector-types API reports as supported', async () => {
    const core = coreMock.createStart();
    const connectors = SUPPORTED_TYPE_IDS.map((connectorTypeId, index) =>
      buildRawConnector({
        id: `connector-${index}`,
        name: `Connector ${connectorTypeId}`,
        connector_type_id: connectorTypeId,
      })
    );
    mockHttpGet(core, { connectors });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectors).toEqual(
      SUPPORTED_TYPE_IDS.map((connectorTypeId, index) => ({
        id: `connector-${index}`,
        name: `Connector ${connectorTypeId}`,
        actionTypeId: connectorTypeId,
      }))
    );
  });

  it('falls back to the connector id as the name when the API returns an empty name', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, {
      connectors: [
        buildRawConnector({ id: 'gd-empty-name', name: '', connector_type_id: '.google_drive' }),
      ],
    });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectors).toEqual([
      { id: 'gd-empty-name', name: 'gd-empty-name', actionTypeId: '.google_drive' },
    ]);
  });

  it('connectorNameById maps each connector id to its resolved name', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, {
      connectors: [
        buildRawConnector({ id: 'gd-1', name: 'Google Drive', connector_type_id: '.google_drive' }),
        buildRawConnector({ id: 'gh-1', name: 'GitHub', connector_type_id: '.github' }),
      ],
    });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connectorNameById.get('gd-1')).toBe('Google Drive');
    expect(result.current.connectorNameById.get('gh-1')).toBe('GitHub');
    expect(result.current.connectorNameById.get('unknown-id')).toBeUndefined();
  });

  it('returns isError and an empty connectors array when the connectors request rejects', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, { connectors: new Error('Network error') });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error('Network error'));
    expect(result.current.connectors).toEqual([]);
  });

  it('returns isError when the connector-types request rejects', async () => {
    const core = coreMock.createStart();
    mockHttpGet(core, { types: new Error('Types error'), connectors: [] });
    const { result } = renderDataConnectors(core);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(new Error('Types error'));
    expect(result.current.connectors).toEqual([]);
  });

  it('does not fetch connectors when enabled is false', () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result } = renderDataConnectors(core, { enabled: false });

    expect(core.http.get).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.connectors).toEqual([]);
  });
});
