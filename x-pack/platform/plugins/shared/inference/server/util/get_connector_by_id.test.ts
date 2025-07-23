/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResult as ActionConnector } from '@kbn/actions-plugin/server';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { InferenceConnectorType } from '@kbn/inference-common';
import { getConnectorById } from './get_connector_by_id';
import { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';

describe('getConnectorById', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  const connectorId = 'my-connector-id';

  const createMockConnector = (parts: Partial<ActionConnector> = {}): ActionConnector => {
    return {
      id: 'mock',
      name: 'Mock',
      actionTypeId: 'action-type',
      ...parts,
    } as ActionConnector;
  };

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    actionsClient.get.mockResolvedValue(createMockConnector());
  });

  it('calls `actionsClient.get` with the right parameters', async () => {
    actionsClient.getAll.mockResolvedValue([
      createMockConnector({
        id: 'foo',
        name: 'Foo',
        actionTypeId: InferenceConnectorType.OpenAI,
      }),
      createMockConnector({
        id: connectorId,
        name: 'Foo',
        actionTypeId: InferenceConnectorType.OpenAI,
      }),
    ] as ConnectorWithExtraFindData[]);

    await getConnectorById({ actionsClient, connectorId });

    expect(actionsClient.getAll).toHaveBeenCalledTimes(1);
  });

  it('throws if `actionsClient.get` throws', async () => {
    actionsClient.getAll.mockImplementation(() => {
      throw new Error('Something wrong');
    });

    await expect(() => getConnectorById({ actionsClient, connectorId })).rejects
      .toThrowErrorMatchingInlineSnapshot(`
      "An error occur fetching connectors for id 'my-connector-id'
      Something wrong"
    `);
  });

  it('throws the connector type is not compatible', async () => {
    actionsClient.getAll.mockResolvedValue([
      createMockConnector({
        id: connectorId,
        name: 'Tcp Pigeon',
        actionTypeId: '.tcp-pigeon',
      }),
    ] as ConnectorWithExtraFindData[]);

    await expect(() =>
      getConnectorById({ actionsClient, connectorId })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Connector '${connectorId}' of type '.tcp-pigeon' not recognized as a supported connector"`
    );
  });

  it('returns the inference connector when successful', async () => {
    actionsClient.getAll.mockResolvedValue([
      createMockConnector({
        id: connectorId,
        name: 'My Name',
        actionTypeId: InferenceConnectorType.OpenAI,
        config: {
          propA: 'foo',
          propB: 42,
        },
      }),
    ] as ConnectorWithExtraFindData[]);

    const connector = await getConnectorById({ actionsClient, connectorId });

    expect(connector).toEqual({
      connectorId,
      name: 'My Name',
      type: InferenceConnectorType.OpenAI,
      config: {
        propA: 'foo',
        propB: 42,
      },
    });
  });
});
