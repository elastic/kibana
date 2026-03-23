/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import type { Props } from '.';
import { useLoadConnectors } from '.';
import { mockConnectors } from '../../mock/connectors';
import { TestProviders } from '../../mock/test_providers/test_providers';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const mockConnectorsAndExtras = [
  ...mockConnectors,
  // These connectors are not supported for inference
  {
    ...mockConnectors[0],
    id: 'connector-missing-secrets',
    name: 'Connector Missing Secrets',
    isMissingSecrets: true,
  },
  {
    ...mockConnectors[0],

    id: 'connector-wrong-action-type',
    name: 'Connector Wrong Action Type',
    isMissingSecrets: true,
    actionTypeId: '.d3',
  },
  {
    ...mockConnectors[0],
    id: 'connector-text-embedding',
    name: 'Text Embedding Connector',
    isMissingSecrets: false,
    actionTypeId: '.inference',
    config: {
      taskType: 'text_embedding',
    },
  },
];

const connectorsApiResponse = mockConnectorsAndExtras.map((c) => ({
  ...c,
  connector_type_id: c.actionTypeId,
  is_preconfigured: false,
  is_deprecated: false,
  referenced_by_count: 0,
  is_missing_secrets: c.isMissingSecrets,
  is_system_action: false,
}));

const loadConnectorsResult = mockConnectors.map((c) => ({
  ...c,
  isPreconfigured: false,
  isDeprecated: false,
  referencedByCount: 0,
  isSystemAction: false,
}));

const http = {
  get: jest.fn().mockResolvedValue(connectorsApiResponse),
};
const toasts = {
  addError: jest.fn(),
};
const settings = {
  client: {
    get: jest.fn().mockImplementation((settingKey) => {
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) {
        return undefined;
      }
      if (settingKey === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) {
        return false;
      }
    }),
  },
};
const defaultProps = { http, toasts, settings } as unknown as Props;

describe('useLoadConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should call api to load action types', async () => {
    renderHook(() => useLoadConnectors(defaultProps), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(defaultProps.http.get).toHaveBeenCalledWith('/api/actions/connectors');
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should return sorted action types, removing isMissingSecrets and wrong action type ids, excluding .inference results', async () => {
    const { result } = renderHook(() => useLoadConnectors(defaultProps), {
      wrapper: TestProviders,
    });
    await waitFor(() => {
      expect(result.current.data).toStrictEqual(
        loadConnectorsResult
          .filter((c) => c.actionTypeId !== '.inference')
          // @ts-ignore ts does not like config, but we define it in the mock data
          .map((c) => ({ ...c, apiProvider: c.config.apiProvider }))
      );
    });
  });

  it('includes preconfigured .inference results when inferenceEnabled is true', async () => {
    const { result } = renderHook(
      () => useLoadConnectors({ ...defaultProps, inferenceEnabled: true }),
      {
        wrapper: TestProviders,
      }
    );
    await waitFor(() => {
      expect(result.current.data).toStrictEqual(
        mockConnectors
          // @ts-ignore ts does not like config, but we define it in the mock data
          .map((c) => ({ ...c, referencedByCount: 0, apiProvider: c?.config?.apiProvider }))
      );
    });
  });
  it('should display error toast when api throws error', async () => {
    const mockHttp = {
      get: jest.fn().mockRejectedValue(new Error('this is an error')),
    } as unknown as Props['http'];
    renderHook(() => useLoadConnectors({ ...defaultProps, http: mockHttp }), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(toasts.addError).toHaveBeenCalled());
  });

  it('should filter out .inference connectors without chat_completion taskType', async () => {
    const { result } = renderHook(
      () => useLoadConnectors({ ...defaultProps, inferenceEnabled: true }),
      {
        wrapper: TestProviders,
      }
    );
    await waitFor(() => {
      const connectorIds = result.current.data?.map((c) => c.id) || [];

      expect(connectorIds).not.toContain('connector-text-embedding');
      expect(connectorIds).not.toContain('text-embedding-connector-id');
      expect(connectorIds).not.toContain('sparse-embedding-connector-id');
      expect(connectorIds).toContain('c29c28a0-20fe-11ee-9386-a1f4d42ec542'); // Regular Inference Connector
      expect(connectorIds).toContain('connectorId'); // OpenAI connector
    });
  });
});
