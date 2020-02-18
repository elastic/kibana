/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, httpServerMock } from '../../../../../../src/core/server/mocks';
import { actionsMock } from '../../../../../plugins/actions/server/mocks';
import { alertsMock } from '../../../../../plugins/alerting/server/mocks';

import { ClientsService } from './clients';

describe('ClientsService', () => {
  describe('spacesClient', () => {
    describe('#getSpaceId', () => {
      it('returns the default spaceId if spaces are disabled', async () => {
        const clients = new ClientsService();

        const actions = actionsMock.createStart();
        const alerting = alertsMock.createStart();
        const { elasticsearch } = coreMock.createSetup();
        const { savedObjects } = coreMock.createStart();
        const request = httpServerMock.createRawRequest();
        const spacesService = undefined;

        clients.setup(elasticsearch.dataClient, spacesService);
        clients.start(savedObjects, actions, alerting);

        const { spacesClient } = await clients.createGetScoped()(request);
        expect(spacesClient.getSpaceId()).toEqual('default');
      });
    });
  });
});
