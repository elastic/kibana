/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { httpServiceMock, loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { actionsConfigMock } from '../actions_config.mock';
import { OAuthRateLimiter } from '../lib/oauth_rate_limiter';
import { defineRoutes } from '.';
import { inboundEventsRoute } from './inbound_events';
import { rotateInboundIngressRoute } from './connector/rotate_inbound_ingress';
import { createConnectorRoute } from './connector/create';
import { getConnectorRoute } from './connector/get';
import { getAllConnectorsRoute } from './connector/get_all';
import { updateConnectorRoute } from './connector/update';
import { getAllConnectorsIncludingSystemRoute } from './connector/get_all_system';

vi.mock('./inbound_events', () => {
      const mocked = {
      inboundEventsRoute: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/rotate_inbound_ingress', () => {
      const mocked = {
      rotateInboundIngressRoute: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./connector/create', () => {
      const mocked = { createConnectorRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/delete', () => {
      const mocked = { deleteConnectorRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/get', () => {
      const mocked = { getConnectorRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/get_all', () => {
      const mocked = { getAllConnectorsRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/update', () => {
      const mocked = { updateConnectorRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/list_types', () => {
      const mocked = { listTypesRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/execute', () => {
      const mocked = { executeConnectorRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./get_global_execution_logs', () => {
      const mocked = { getGlobalExecutionLogRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./get_global_execution_kpi', () => {
      const mocked = { getGlobalExecutionKPIRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./get_oauth_access_token', () => {
      const mocked = { getOAuthAccessToken: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./oauth_authorize', () => {
      const mocked = { oauthAuthorizeRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./oauth_callback', () => {
      const mocked = {
      oauthCallbackRoute: vi.fn(),
      oauthCallbackScriptRoute: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./oauth_disconnect', () => {
      const mocked = { oauthDisconnectRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./oauth_cancel', () => {
      const mocked = { oauthCancelRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/get_all_system', () => {
      const mocked = {
      getAllConnectorsIncludingSystemRoute: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/auth_status', () => {
      const mocked = { connectorAuthStatusRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/list_types_system', () => {
      const mocked = { listTypesWithSystemRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });
vi.mock('./connector/get_spec', () => {
      const mocked = { getConnectorSpecRoute: vi.fn() };
      return { ...mocked, default: mocked };
    });

const inboundEventsRouteMock = inboundEventsRoute as MockedFunction<typeof inboundEventsRoute>;
const rotateInboundIngressRouteMock = rotateInboundIngressRoute as MockedFunction<
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
    vi.clearAllMocks();
  });

  it('registers inbound events when inboundEvents opts are provided', () => {
    const inboundEvents = {
      maxBodyBytes: 1024,
      client: { ingest: vi.fn() },
      getSpaceId: vi.fn().mockReturnValue('default'),
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

  it('passes actionsConfigUtils to connector CRUD routes so is_inbound_events_enabled can be gated', () => {
    const opts = baseOpts();
    defineRoutes(opts);

    expect(createConnectorRoute).toHaveBeenCalledWith(
      opts.router,
      opts.licenseState,
      opts.actionsConfigUtils
    );
    expect(getConnectorRoute).toHaveBeenCalledWith(
      opts.router,
      opts.licenseState,
      opts.actionsConfigUtils
    );
    expect(getAllConnectorsRoute).toHaveBeenCalledWith(
      opts.router,
      opts.licenseState,
      opts.actionsConfigUtils
    );
    expect(updateConnectorRoute).toHaveBeenCalledWith(
      opts.router,
      opts.licenseState,
      opts.actionsConfigUtils
    );
    expect(getAllConnectorsIncludingSystemRoute).toHaveBeenCalledWith(
      opts.router,
      opts.licenseState,
      opts.actionsConfigUtils
    );
  });
});
