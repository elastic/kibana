/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { Request } from '@kbn/core-di-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { Container, ContainerModule } from 'inversify';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { AlertActionEventPublisher } from '../lib/events/alert_action_event_publisher/alert_action_event_publisher';
import { createAlertActionEventPublisher } from '../lib/events/alert_action_event_publisher/alert_action_event_publisher.mock';
import { AuthService } from '../lib/services/auth_service/auth_service';
import { QueryServiceInternalToken } from '../lib/services/query_service/tokens';
import { createQueryService } from '../lib/services/query_service/query_service.mock';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { createMockResourceManager } from '../lib/services/resource_service/resource_manager.mock';
import { SpacesService } from '../lib/services/spaces_service/spaces_service';
import { createSpacesServiceMock } from '../lib/services/spaces_service/spaces_service.mock';
import { StorageServiceInternalToken } from '../lib/services/storage_service/tokens';
import { createStorageService } from '../lib/services/storage_service/storage_service.mock';
import { UserService } from '../lib/services/user_service/user_service';
import { createUserService } from '../lib/services/user_service/user_service.mock';
import { bindClients } from './bind_clients';

describe('bindClients - AlertActionsClient authorization', () => {
  let container: Container;
  let ensureAuthorized: jest.Mock;
  let queryServiceEsClient: ReturnType<typeof createQueryService>['mockEsClient'];
  let storageServiceEsClient: ReturnType<typeof createStorageService>['mockEsClient'];

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    ensureAuthorized = jest.fn().mockResolvedValue(undefined);

    const { queryService, mockEsClient: queryEsClient } = createQueryService();
    const { storageService, mockEsClient: storageEsClient } = createStorageService();
    queryServiceEsClient = queryEsClient;
    storageServiceEsClient = storageEsClient;

    container.bind(Request).toConstantValue(httpServerMock.createKibanaRequest());
    container.bind(SpacesService).toConstantValue(createSpacesServiceMock().spacesService);
    container.bind(QueryServiceInternalToken).toConstantValue(queryService);
    container.bind(StorageServiceInternalToken).toConstantValue(storageService);
    container.bind(UserService).toConstantValue(createUserService().userService);
    container
      .bind(AlertActionEventPublisher)
      .toConstantValue(createAlertActionEventPublisher().publisher);
    container
      .bind(ResourceManager)
      .toConstantValue(createMockResourceManager() as unknown as ResourceManager);
    container.bind(AuthService).toConstantValue({ ensureAuthorized } as unknown as AuthService);

    container.load(new ContainerModule((options) => bindClients(options)));
  });

  it('resolves a client whose public methods require the "Alerts: All" privilege', async () => {
    ensureAuthorized.mockRejectedValue(Boom.forbidden('denied'));
    const client = container.get(AlertActionsClient);

    await expect(
      client.createEpisodeAction({
        episodeId: 'episode-1',
        action: { action_type: ALERT_EPISODE_ACTION_TYPE.ACK },
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(ensureAuthorized).toHaveBeenCalledWith({ feature: 'alerts', operation: 'write' });
    expect(queryServiceEsClient.esql.query).not.toHaveBeenCalled();
    expect(storageServiceEsClient.bulk).not.toHaveBeenCalled();
  });

  const invocations: Array<[string, (client: AlertActionsClient) => Promise<unknown>]> = [
    [
      'createSeriesAction',
      (client) =>
        client.createSeriesAction({
          seriesId: 'series-1',
          action: { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
        }),
    ],
    ['createBulkSeriesActions', (client) => client.createBulkSeriesActions([])],
    ['createBulkEpisodeActions', (client) => client.createBulkEpisodeActions([])],
  ];

  it.each(invocations)('guards %s', async (_method, invoke) => {
    ensureAuthorized.mockRejectedValue(Boom.forbidden('denied'));
    const client = container.get(AlertActionsClient);

    await expect(invoke(client)).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(ensureAuthorized).toHaveBeenCalledWith({ feature: 'alerts', operation: 'write' });
  });
});
