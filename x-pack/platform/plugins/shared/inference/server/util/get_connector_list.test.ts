/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { InferenceConnectorType } from '@kbn/inference-common';
import { getConnectorList } from './get_connector_list';
import { getInferenceEndpoints } from './get_inference_endpoints';

jest.mock('./get_inference_endpoints');

const getInferenceEndpointsMock = getInferenceEndpoints as jest.MockedFn<
  typeof getInferenceEndpoints
>;

describe('getConnectorList', () => {
  let actions: ReturnType<typeof actionsMock.createStart>;
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  const esClient = {} as any;
  const logger = loggerMock.create();

  beforeEach(() => {
    actions = actionsMock.createStart();
    actionsClient = actionsClientMock.create();
    request = httpServerMock.createKibanaRequest();
    actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    actionsClient.getAll.mockResolvedValue([]);
    getInferenceEndpointsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns stack connectors from the actions plugin', async () => {
    actionsClient.getAll.mockResolvedValue([
      {
        id: 'connector-1',
        actionTypeId: InferenceConnectorType.OpenAI,
        name: 'My OpenAI Connector',
        config: { apiProvider: 'OpenAI' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 0,
        isMissingSecrets: false,
      },
    ] as any);

    const result = await getConnectorList({ actions, request, esClient, logger });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      connectorId: 'connector-1',
      name: 'My OpenAI Connector',
      type: InferenceConnectorType.OpenAI,
      isInferenceEndpoint: false,
    });
  });

  it('returns native inference endpoints with display.name when available', async () => {
    getInferenceEndpointsMock.mockResolvedValue([
      {
        inferenceId: 'my-endpoint',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: { model_id: 'gpt-4' },
        metadata: { display: { name: 'My Preconfigured Endpoint' } },
      },
    ]);

    const result = await getConnectorList({ actions, request, esClient, logger });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      connectorId: 'my-endpoint',
      name: 'My Preconfigured Endpoint',
      type: InferenceConnectorType.Inference,
      isInferenceEndpoint: true,
      isPreconfigured: true,
      isEis: false,
    });
  });

  it('uses the matching stack connector name when the endpoint has no display.name', async () => {
    actionsClient.getAll.mockResolvedValue([
      {
        id: 'stack-connector-id',
        actionTypeId: InferenceConnectorType.Inference,
        name: 'My Named Connector',
        config: { inferenceId: 'my-endpoint', taskType: 'chat_completion' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 0,
        isMissingSecrets: false,
      },
    ] as any);

    getInferenceEndpointsMock.mockResolvedValue([
      {
        inferenceId: 'my-endpoint',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: {},
        metadata: {},
      },
    ]);

    const result = await getConnectorList({ actions, request, esClient, logger });

    const endpoint = result.find((c) => c.isInferenceEndpoint);
    expect(endpoint).toMatchObject({
      connectorId: 'my-endpoint',
      name: 'My Named Connector',
      isInferenceEndpoint: true,
      isPreconfigured: false,
      isEis: false,
    });
  });

  it('falls back to inferenceId as name when no display.name and no matching stack connector', async () => {
    getInferenceEndpointsMock.mockResolvedValue([
      {
        inferenceId: 'my-endpoint',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: {},
        metadata: {},
      },
    ]);

    const result = await getConnectorList({ actions, request, esClient, logger });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      connectorId: 'my-endpoint',
      name: 'my-endpoint',
      isInferenceEndpoint: true,
    });
  });

  it('deduplicates: excludes the .inference stack connector when a matching ES endpoint exists', async () => {
    actionsClient.getAll.mockResolvedValue([
      {
        id: 'stack-connector-id',
        actionTypeId: InferenceConnectorType.Inference,
        name: 'My Custom Connector',
        config: { inferenceId: 'my-endpoint', taskType: 'chat_completion' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 0,
        isMissingSecrets: false,
      },
    ] as any);

    getInferenceEndpointsMock.mockResolvedValue([
      {
        inferenceId: 'my-endpoint',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: {},
        metadata: {},
      },
    ]);

    const result = await getConnectorList({ actions, request, esClient, logger });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      connectorId: 'my-endpoint',
      isInferenceEndpoint: true,
    });
    expect(result.find((c) => !c.isInferenceEndpoint)).toBeUndefined();
  });

  it('prefers display.name over stack connector name', async () => {
    actionsClient.getAll.mockResolvedValue([
      {
        id: 'stack-connector-id',
        actionTypeId: InferenceConnectorType.Inference,
        name: 'Stack Connector Name',
        config: { inferenceId: 'my-endpoint', taskType: 'chat_completion' },
        isPreconfigured: false,
        isSystemAction: false,
        isDeprecated: false,
        referencedByCount: 0,
        isMissingSecrets: false,
      },
    ] as any);

    getInferenceEndpointsMock.mockResolvedValue([
      {
        inferenceId: 'my-endpoint',
        taskType: 'chat_completion',
        service: 'openai',
        serviceSettings: {},
        metadata: { display: { name: 'Display Name Takes Priority' } },
      },
    ]);

    const result = await getConnectorList({ actions, request, esClient, logger });

    const endpoint = result.find((c) => c.isInferenceEndpoint);
    expect(endpoint?.name).toBe('Display Name Takes Priority');
  });
});
