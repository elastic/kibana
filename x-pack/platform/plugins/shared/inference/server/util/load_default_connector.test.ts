/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loadDefaultConnector } from './load_default_connector';
import { getConnectorList } from './get_connector_list';

jest.mock('./get_connector_list');

const getConnectorListMock = getConnectorList as jest.MockedFn<typeof getConnectorList>;

const createConnector = (parts: Partial<InferenceConnector> = {}): InferenceConnector => ({
  connectorId: 'default-id',
  name: 'Default',
  type: InferenceConnectorType.OpenAI,
  config: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
  capabilities: {},
  ...parts,
});

describe('loadDefaultConnector', () => {
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  const esClient = {} as any;
  const logger = loggerMock.create();

  const uiSettingsClient = {
    get: jest.fn(),
  } as any;

  beforeEach(() => {
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();
    uiSettingsClient.get.mockResolvedValue('NO_DEFAULT_CONNECTOR');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the connector matching the genAiSettings default connector setting', async () => {
    const connectors = [
      createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
      createConnector({ connectorId: 'bedrock-1', type: InferenceConnectorType.Bedrock }),
    ];
    getConnectorListMock.mockResolvedValue(connectors);
    uiSettingsClient.get.mockResolvedValue('bedrock-1');

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result.connectorId).toBe('bedrock-1');
  });

  it('falls back to type-based priority when setting is NO_DEFAULT_CONNECTOR', async () => {
    const connectors = [
      createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
      createConnector({ connectorId: 'inference-1', type: InferenceConnectorType.Inference }),
    ];
    getConnectorListMock.mockResolvedValue(connectors);
    uiSettingsClient.get.mockResolvedValue('NO_DEFAULT_CONNECTOR');

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result.connectorId).toBe('inference-1');
  });

  it('passes the request as context when reading the ui setting', async () => {
    getConnectorListMock.mockResolvedValue([
      createConnector({ connectorId: 'openai-1', type: InferenceConnectorType.OpenAI }),
    ]);

    await loadDefaultConnector({ actions, request, esClient, uiSettingsClient, logger });

    expect(uiSettingsClient.get).toHaveBeenCalledWith('genAiSettings:defaultAIConnector', {
      request,
    });
  });
});
