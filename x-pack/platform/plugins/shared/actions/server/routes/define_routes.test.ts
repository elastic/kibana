/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { actionsConfigMock } from '../actions_config.mock';
import { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
import { defineRoutes } from '.';
import { inboundEventsRoute } from './inbound_events';
import { rotateInboundIngressRoute } from './connector/rotate_inbound_ingress';

jest.mock('./inbound_events', () => ({
  inboundEventsRoute: jest.fn(),
}));
jest.mock('./connector/rotate_inbound_ingress', () => ({
  rotateInboundIngressRoute: jest.fn(),
}));

jest.mock('./connector/create', () => ({ createConnectorRoute: jest.fn() }));
jest.mock('./connector/delete', () => ({ deleteConnectorRoute: jest.fn() }));
jest.mock('./connector/get', () => ({ getConnectorRoute: jest.fn() }));
jest.mock('./connector/get_all', () => ({ getAllConnectorsRoute: jest.fn() }));
jest.mock('./connector/update', () => ({ updateConnectorRoute: jest.fn() }));
jest.mock('./connector/list_types', () => ({ listTypesRoute: jest.fn() }));
jest.mock('./connector/execute', () => ({ executeConnectorRoute: jest.fn() }));
jest.mock('./get_global_execution_logs', () => ({ getGlobalExecutionLogRoute: jest.fn() }));
jest.mock('./get_global_execution_kpi', () => ({ getGlobalExecutionKPIRoute: jest.fn() }));
jest.mock('./get_oauth_access_token', () => ({ getOAuthAccessToken: jest.fn() }));
jest.mock('./oauth_authorize', () => ({ oauthAuthorizeRoute: jest.fn() }));
jest.mock('./oauth_callback', () => ({
  oauthCallbackRoute: jest.fn(),
  oauthCallbackScriptRoute: jest.fn(),
}));
jest.mock('./oauth_disconnect', () => ({ oauthDisconnectRoute: jest.fn() }));
jest.mock('./oauth_cancel', () => ({ oauthCancelRoute: jest.fn() }));
jest.mock('./connector/get_all_system', () => ({
  getAllConnectorsIncludingSystemRoute: jest.fn(),
}));
jest.mock('./connector/auth_status', () => ({ connectorAuthStatusRoute: jest.fn() }));
jest.mock('./connector/list_types_system', () => ({ listTypesWithSystemRoute: jest.fn() }));
jest.mock('./connector/get_spec', () => ({ getConnectorSpecRoute: jest.fn() }));

const inboundEventsRouteMock = inboundEventsRoute as jest.MockedFunction<typeof inboundEventsRoute>;
const rotateInboundIngressRouteMock = rotateInboundIngressRoute as jest.MockedFunction<
  typeof rotateInboundIngressRoute
>;

describe('defineRoutes', () => {
  const baseOpts = () => ({
    router: httpServiceMock.createRouter(),
    licenseState: licenseStateMock.create(),
    actionsConfigUtils: actionsConfigMock.create(),
    logger: loggingSystemMock.createLogger(),
    core: coreMock.createSetup(),
    oauthRateLimiter: new OAuthRateLimiter({
      config: {
        authorize: { lookbackWindow: '1h', limit: 100 },
        callback: { lookbackWindow: '1h', limit: 100 },
      },
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers inbound events when inboundEvents opts are provided', () => {
    const inboundEvents = {
      maxBodyBytes: 1024,
      client: { ingest: jest.fn() },
      getSpaceId: jest.fn().mockReturnValue('default'),
    };

    defineRoutes({ ...baseOpts(), inboundEvents });

    expect(inboundEventsRouteMock).toHaveBeenCalledWith({
      router: expect.any(Object),
      maxBodyBytes: 1024,
      inboundEventsClient: inboundEvents.client,
      getSpaceId: inboundEvents.getSpaceId,
    });
    expect(rotateInboundIngressRouteMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('skips inbound events registration when inboundEvents opts are omitted', () => {
    defineRoutes(baseOpts());
    expect(inboundEventsRouteMock).not.toHaveBeenCalled();
    expect(rotateInboundIngressRouteMock).not.toHaveBeenCalled();
  });
});
