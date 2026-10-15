/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { RequestHandler } from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { License } from '@kbn/license-api-guard-plugin/server';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { LicenseType } from '@kbn/licensing-types';
import { MINIMUM_LICENSE_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../../common';
import type { DataFederationConfigType } from '../config';
import { registerDataSetsRoutes } from './register_routes';

const config: DataFederationConfigType = {
  enabled: true,
  enableFederatedIdentityAuth: false,
  enableGoogleCloudStorageDataSourceType: false,
  enableAzureDataSourceType: false,
};

const setup = (type: LicenseType) => {
  const router = httpServiceMock.createRouter();
  const license = new License();
  license.setup({ pluginName: PLUGIN_NAME, logger: loggingSystemMock.createLogger() });
  license.start({
    pluginId: PLUGIN_ID,
    minimumLicenseType: MINIMUM_LICENSE_TYPE,
    licensing: {
      license$: new BehaviorSubject(licensingMock.createLicense({ license: { type } })),
    },
  });

  registerDataSetsRoutes(router, license, config);

  const handlers = [
    ...router.get.mock.calls,
    ...router.put.mock.calls,
    ...router.delete.mock.calls,
  ].map(([, handler]) => handler as RequestHandler);

  return { handlers };
};

describe('registerDataSetsRoutes', () => {
  it.each<LicenseType>(['basic', 'gold', 'platinum'])(
    'returns 403 on every route with a %s license',
    async (type) => {
      const { handlers } = setup(type);
      expect(handlers).toHaveLength(8);

      for (const handler of handlers) {
        const response = httpServerMock.createResponseFactory();
        await handler(
          coreMock.createCustomRequestHandlerContext({}),
          httpServerMock.createKibanaRequest(),
          response
        );
        expect(response.forbidden).toHaveBeenCalled();
      }
    }
  );

  it.each<LicenseType>(['enterprise', 'trial'])(
    'lets every route reach Elasticsearch with a %s license',
    async (type) => {
      const { handlers } = setup(type);
      const core = coreMock.createRequestHandlerContext();
      core.elasticsearch.client.asCurrentUser.transport.request.mockResolvedValue({});
      const context = coreMock.createCustomRequestHandlerContext({ core });
      const request = httpServerMock.createKibanaRequest({
        params: { id: 'test' },
        body: { type: 's3' },
      });

      for (const handler of handlers) {
        const response = httpServerMock.createResponseFactory();
        await handler(context, request, response);
        expect(response.ok).toHaveBeenCalled();
      }

      expect(core.elasticsearch.client.asCurrentUser.transport.request).toHaveBeenCalledTimes(8);
    }
  );
});
