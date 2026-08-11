/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { getConnectorById } from './get_connector_by_id';
import { getConnectorList } from './get_connector_list';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('./get_connector_list');

const getConnectorListMock = getConnectorList as jest.MockedFn<typeof getConnectorList>;

describe('getConnectorById', () => {
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  const esClient = {} as any;
  const connectorId = 'my-connector-id';

  const createMockInferenceConnector = (
    parts: Partial<InferenceConnector> = {}
  ): InferenceConnector => ({
    connectorId: 'mock',
    name: 'Mock',
    type: InferenceConnectorType.OpenAI,
    config: {},
    isInferenceEndpoint: false,
    isPreconfigured: false,
    capabilities: {},
    ...parts,
  });

  const logger = loggerMock.create();

  beforeEach(() => {
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();
    getConnectorListMock.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the matching connector from the list', async () => {
    const expected = createMockInferenceConnector({
      connectorId,
      name: 'My Connector',
      type: InferenceConnectorType.OpenAI,
      config: { propA: 'foo' },
    });
    getConnectorListMock.mockResolvedValue([
      createMockInferenceConnector({ connectorId: 'other' }),
      expected,
    ]);

    const result = await getConnectorById({ actions, request, connectorId, esClient, logger });

    expect(result).toEqual(expected);
    expect(getConnectorListMock).toHaveBeenCalledTimes(1);
    expect(getConnectorListMock).toHaveBeenCalledWith({ actions, request, esClient, logger });
  });

  it('returns an inference endpoint from the list', async () => {
    const expected = createMockInferenceConnector({
      connectorId: 'my-endpoint',
      name: 'my-endpoint',
      type: InferenceConnectorType.Inference,
      isInferenceEndpoint: true,
    });
    getConnectorListMock.mockResolvedValue([expected]);

    const result = await getConnectorById({
      actions,
      request,
      connectorId: 'my-endpoint',
      esClient,
      logger,
    });

    expect(result).toEqual(expected);
  });

  it('resolves a stack connector ID to its superseding inference endpoint', async () => {
    const inferenceEndpoint = createMockInferenceConnector({
      connectorId: 'my-inference-id',
      name: 'My EIS Endpoint',
      type: InferenceConnectorType.Inference,
      isInferenceEndpoint: true,
    });
    // The filtered list only contains the endpoint, not the stack connector
    getConnectorListMock.mockResolvedValue([inferenceEndpoint]);

    const actionsClient = await actions.getActionsClientWithRequest(request);
    (actionsClient.getAll as jest.Mock).mockResolvedValue([
      {
        id: connectorId,
        actionTypeId: InferenceConnectorType.Inference,
        name: 'My Stack Connector',
        config: { inferenceId: 'my-inference-id' },
        isPreconfigured: true,
      },
    ]);

    const result = await getConnectorById({ actions, request, connectorId, esClient, logger });

    expect(result).toEqual(inferenceEndpoint);
  });

  it('throws if no connector matches the id', async () => {
    getConnectorListMock.mockResolvedValue([
      createMockInferenceConnector({ connectorId: 'other' }),
    ]);
    const actionsClient = await actions.getActionsClientWithRequest(request);
    (actionsClient.getAll as jest.Mock).mockResolvedValue([]);

    await expect(
      getConnectorById({ actions, request, connectorId, esClient, logger })
    ).rejects.toThrow("No connector or inference endpoint found for ID 'my-connector-id'");
  });

  it('throws if the connector list is empty', async () => {
    getConnectorListMock.mockResolvedValue([]);
    const actionsClient = await actions.getActionsClientWithRequest(request);
    (actionsClient.getAll as jest.Mock).mockResolvedValue([]);

    await expect(
      getConnectorById({ actions, request, connectorId, esClient, logger })
    ).rejects.toThrow("No connector or inference endpoint found for ID 'my-connector-id'");
  });
});
