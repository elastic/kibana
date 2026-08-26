/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InferenceConnectorType,
  defaultInferenceEndpoints,
  type InferenceConnector,
} from '@kbn/inference-common';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loadDefaultConnector } from './load_default_connector';
import { getConnectorById } from './get_connector_by_id';
import { getConnectorList } from './get_connector_list';

jest.mock('./get_connector_by_id');
jest.mock('./get_connector_list');

const getConnectorByIdMock = getConnectorById as jest.MockedFn<typeof getConnectorById>;
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
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector')
        return Promise.resolve('NO_DEFAULT_CONNECTOR');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });
    getConnectorByIdMock.mockReset();
    getConnectorListMock.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the connector matching the uiSettings default connector', async () => {
    const connector = createConnector({
      connectorId: 'bedrock-1',
      type: InferenceConnectorType.Bedrock,
    });
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector') return Promise.resolve('bedrock-1');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });
    getConnectorByIdMock.mockResolvedValue(connector);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBe(connector);
    expect(getConnectorByIdMock).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'bedrock-1' })
    );
  });

  it('falls through when the configured default connector does not exist', async () => {
    const kibanaDefault = createConnector({
      connectorId: defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION,
      type: InferenceConnectorType.Inference,
    });
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector') return Promise.resolve('missing-id');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(false);
      return Promise.resolve(undefined);
    });
    getConnectorByIdMock
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce(kibanaDefault);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBe(kibanaDefault);
  });

  it('returns the kibana-wide default when no uiSettings default is set', async () => {
    const kibanaDefault = createConnector({
      connectorId: defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION,
      type: InferenceConnectorType.Inference,
    });
    getConnectorByIdMock.mockResolvedValue(kibanaDefault);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBe(kibanaDefault);
    expect(getConnectorByIdMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId: defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION,
      })
    );
  });

  it('returns the first connector when the kibana-wide default does not exist', async () => {
    const firstConnector = createConnector({
      connectorId: 'first',
      type: InferenceConnectorType.Bedrock,
    });
    getConnectorByIdMock.mockRejectedValue(new Error('not found'));
    getConnectorListMock.mockResolvedValue([
      firstConnector,
      createConnector({ connectorId: 'second', type: InferenceConnectorType.OpenAI }),
    ]);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBe(firstConnector);
  });

  it('returns undefined when defaultOnly is true and no uiSettings default is configured', async () => {
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector')
        return Promise.resolve('NO_DEFAULT_CONNECTOR');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBeUndefined();
    expect(getConnectorByIdMock).not.toHaveBeenCalled();
    expect(getConnectorListMock).not.toHaveBeenCalled();
  });

  it('returns undefined when defaultOnly is true and the configured default does not exist', async () => {
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector') return Promise.resolve('missing-id');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    getConnectorByIdMock.mockRejectedValue(new Error('not found'));

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBeUndefined();
  });

  it('returns the uiSettings default even when defaultOnly is true', async () => {
    const connector = createConnector({
      connectorId: 'bedrock-1',
      type: InferenceConnectorType.Bedrock,
    });
    uiSettingsClient.get.mockImplementation((key: string) => {
      if (key === 'genAiSettings:defaultAIConnector') return Promise.resolve('bedrock-1');
      if (key === 'genAiSettings:defaultAIConnectorOnly') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });
    getConnectorByIdMock.mockResolvedValue(connector);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBe(connector);
  });

  it('returns undefined when no connectors exist and defaultOnly is false', async () => {
    getConnectorByIdMock.mockRejectedValue(new Error('not found'));
    getConnectorListMock.mockResolvedValue([]);

    const result = await loadDefaultConnector({
      actions,
      request,
      esClient,
      uiSettingsClient,
      logger,
    });

    expect(result).toBeUndefined();
  });

  it('passes the request as context when reading ui settings', async () => {
    getConnectorByIdMock.mockRejectedValue(new Error('not found'));
    getConnectorListMock.mockResolvedValue([]);

    await loadDefaultConnector({ actions, request, esClient, uiSettingsClient, logger });

    expect(uiSettingsClient.get).toHaveBeenCalledWith('genAiSettings:defaultAIConnector', {
      request,
    });
    expect(uiSettingsClient.get).toHaveBeenCalledWith('genAiSettings:defaultAIConnectorOnly', {
      request,
    });
  });
});
