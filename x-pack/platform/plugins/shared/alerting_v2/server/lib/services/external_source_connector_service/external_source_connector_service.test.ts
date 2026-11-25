/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { actionsClientMock, actionsMock } from '@kbn/actions-plugin/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { ExternalSourceConnectorService } from './external_source_connector_service';

describe('ExternalSourceConnectorService', () => {
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let service: ExternalSourceConnectorService;

  beforeEach(() => {
    actionsClient = actionsClientMock.create();
    const actions = actionsMock.createStart();
    actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
    service = new ExternalSourceConnectorService(actions, httpServerMock.createKibanaRequest());
  });

  it('creates a Datadog connector with no authentication and returns its id', async () => {
    actionsClient.create.mockResolvedValue({ id: 'connector-1' } as never);

    const id = await service.create({ type: 'datadog', name: 'Datadog production' });

    expect(id).toBe('connector-1');
    expect(actionsClient.create).toHaveBeenCalledWith({
      action: {
        actionTypeId: '.datadog',
        name: 'Datadog production',
        config: { authType: 'none' },
        secrets: { authType: 'none' },
      },
    });
  });

  it('deletes the connector', async () => {
    await service.delete('connector-1');

    expect(actionsClient.delete).toHaveBeenCalledWith({ id: 'connector-1' });
  });

  it.each([
    ['a saved object not found error', SavedObjectsErrorHelpers.createGenericNotFoundError()],
    ['a 404 Boom error', Boom.notFound()],
  ])('ignores %s when deleting', async (_, error) => {
    actionsClient.delete.mockRejectedValue(error);

    await expect(service.delete('connector-1')).resolves.toBeUndefined();
  });

  it('rethrows other delete errors', async () => {
    const failure = Boom.forbidden('Unauthorized to delete connectors');
    actionsClient.delete.mockRejectedValue(failure);

    await expect(service.delete('connector-1')).rejects.toBe(failure);
  });
});
