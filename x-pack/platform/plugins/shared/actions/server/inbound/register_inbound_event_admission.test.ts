/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { loggingSystemMock, httpServerMock } from '@kbn/core/server/mocks';
import type { HttpServiceSetup, KibanaRequest, OnPreAuthToolkit } from '@kbn/core/server';

import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_MALFORMED_PATH_MESSAGE,
  INBOUND_EVENTS_RATE_LIMITED_MESSAGE,
} from './constants';
import { InboundEventAdmission } from './inbound_event_admission';
import {
  admitInboundEventRequest,
  registerInboundEventAdmission,
} from './register_inbound_event_admission';

const admissionConfig = {
  enabled: true,
  maxInFlight: 1,
  maxInFlightPerConnector: 1,
};

const createRequest = ({
  method = 'post',
  path,
  routePath = INBOUND_EVENTS_API_PATH,
  params,
  connectorTypeId = 'slack',
  connectorId = 'c1',
  completed$ = new Subject<void>(),
}: {
  method?: 'post' | 'get';
  /** Concrete URL. `route.path` on a real KibanaRequest. */
  path?: string;
  /** Registered route template. `route.routePath` on a real KibanaRequest. */
  routePath?: string;
  params?: Record<string, string>;
  connectorTypeId?: string;
  connectorId?: string;
  completed$?: Subject<void>;
} = {}) => {
  // The hook reads route, params, id, and completed$. A full KibanaRequest cannot emit completed$ on demand.
  const request = {
    id: 'req-1',
    route: {
      method,
      path: path ?? `/api/actions/events/${connectorTypeId}/${connectorId}`,
      routePath,
    },
    params: params ?? { connector_type_id: connectorTypeId, connector_id: connectorId },
    events: { completed$ },
  } as unknown as KibanaRequest;
  return { request, completed$ };
};

describe('registerInboundEventAdmission', () => {
  const logger = loggingSystemMock.createLogger();
  const getSpaceId = jest.fn().mockReturnValue('default');

  const register = (enabled = true) => {
    const registerOnPreAuth = jest.fn();
    const http: Pick<HttpServiceSetup, 'registerOnPreAuth'> = { registerOnPreAuth };
    registerInboundEventAdmission({
      http,
      logger,
      admission: new InboundEventAdmission({ ...admissionConfig, enabled }),
      config: { ...admissionConfig, enabled },
      maxBodyBytes: 1024 * 1024,
      getSpaceId,
    });
    return registerOnPreAuth;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register the hook when admission is disabled', () => {
    const registerOnPreAuth = register(false);
    expect(registerOnPreAuth).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs the caps and registers one hook when admission is enabled', () => {
    const registerOnPreAuth = register(true);
    expect(registerOnPreAuth).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Inbound events admission maxInFlight=1 maxInFlightPerConnector=1 maxBodyBytes=1048576'
    );
  });
});

describe('admitInboundEventRequest', () => {
  const logger = loggingSystemMock.createLogger();
  const getSpaceId = jest.fn().mockReturnValue('default');

  const admit = (
    admission: InboundEventAdmission,
    request: KibanaRequest,
    toolkit: OnPreAuthToolkit
  ) => {
    const response = httpServerMock.createResponseFactory();
    const result = admitInboundEventRequest({
      request,
      response,
      toolkit,
      admission,
      logger,
      getSpaceId,
    });
    return { response, result, toolkit };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getSpaceId.mockReturnValue('default');
  });

  it('calls next for a matching request under the cap', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const tryAdmit = jest.spyOn(admission, 'tryAdmit');
    const toolkit = { next: jest.fn().mockReturnValue('next') };
    getSpaceId.mockReturnValue('space-a');
    const { request } = createRequest();

    const { response, result } = admit(admission, request, toolkit);

    expect(result).toBe('next');
    expect(tryAdmit).toHaveBeenCalledWith('space-a\0.slack\0c1');
    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('returns 429 when the process cap is full and does not continue', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const toolkit = { next: jest.fn().mockReturnValue('next') };
    const held = createRequest({ connectorId: 'held' });
    admit(admission, held.request, toolkit);

    const blocked = createRequest({ connectorId: 'blocked' });
    const { response, result } = admit(admission, blocked.request, { next: jest.fn() });

    expect(toolkit.next).toHaveBeenCalledTimes(1);
    expect(result).not.toBe('next');
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: INBOUND_EVENTS_RATE_LIMITED_MESSAGE,
      headers: {
        'Retry-After': '1',
        RateLimit: '"inbound-events";r=0;t=1',
      },
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('detail=budget=inflight scope=process retryAfter=1'),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          budget: 'inflight',
          scope: 'process',
          retryAfterSeconds: 1,
          connectorId: 'blocked',
        }),
      })
    );
  });

  it('returns 429 for a full connector and still admits a different connector', () => {
    const admission = new InboundEventAdmission({
      enabled: true,
      maxInFlight: 2,
      maxInFlightPerConnector: 1,
    });
    const toolkit = { next: jest.fn().mockReturnValue('next') };
    const first = createRequest({ connectorId: 'c1' });
    admit(admission, first.request, toolkit);

    const same = createRequest({ connectorId: 'c1' });
    const denied = admit(admission, same.request, { next: jest.fn() });
    expect(denied.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('scope=connector'),
      expect.anything()
    );

    const other = createRequest({ connectorId: 'c2' });
    const allowed = admit(admission, other.request, { next: jest.fn().mockReturnValue('next') });
    expect(allowed.result).toBe('next');
  });

  it('frees the slot when the request completes', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const toolkit = { next: jest.fn().mockReturnValue('next') };
    const first = createRequest();
    admit(admission, first.request, toolkit);

    const blocked = createRequest({ connectorId: 'c2' });
    const denied = admit(admission, blocked.request, { next: jest.fn() });
    expect(denied.response.customError).toHaveBeenCalled();

    first.completed$.next();
    const retried = createRequest({ connectorId: 'c2' });
    const allowed = admit(admission, retried.request, { next: jest.fn().mockReturnValue('next') });
    expect(allowed.result).toBe('next');
  });

  it('ignores a second completion', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const first = createRequest();
    admit(admission, first.request, { next: jest.fn().mockReturnValue('next') });
    first.completed$.next();
    first.completed$.next();

    const second = createRequest({ connectorId: 'c2' });
    const allowed = admit(admission, second.request, { next: jest.fn().mockReturnValue('next') });
    expect(allowed.result).toBe('next');
    const third = createRequest({ connectorId: 'c3' });
    const denied = admit(admission, third.request, { next: jest.fn() });
    expect(denied.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 })
    );
  });

  it('ignores other routes', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const tryAdmit = jest.spyOn(admission, 'tryAdmit');
    const toolkit = { next: jest.fn().mockReturnValue('next') };

    admit(admission, createRequest({ method: 'get' }).request, toolkit);
    admit(
      admission,
      createRequest({
        path: '/api/actions/connector/c1',
        routePath: '/api/actions/connector/{id}',
      }).request,
      toolkit
    );

    expect(tryAdmit).not.toHaveBeenCalled();
    expect(toolkit.next).toHaveBeenCalledTimes(2);
  });

  it('shares one connector slot across equivalent percent-encodings', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const tryAdmit = jest.spyOn(admission, 'tryAdmit');
    const encoded = createRequest({
      path: '/api/actions/events/%73lack/c%31',
      params: {},
    });

    const admitted = admit(admission, encoded.request, { next: jest.fn().mockReturnValue('next') });
    expect(admitted.result).toBe('next');
    expect(tryAdmit).toHaveBeenCalledWith('default\0.slack\0c1');

    const plain = createRequest({ path: '/api/actions/events/slack/c1', params: {} });
    const denied = admit(admission, plain.request, { next: jest.fn() });
    expect(denied.response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429 })
    );
  });

  it('rejects a malformed percent-encoding without taking a slot', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const tryAdmit = jest.spyOn(admission, 'tryAdmit');
    const { request } = createRequest({
      path: '/api/actions/events/slack/c%ZZ',
      params: {},
    });

    const { response, result } = admit(admission, request, { next: jest.fn() });
    expect(tryAdmit).not.toHaveBeenCalled();
    expect(result).not.toBe('next');
    expect(response.badRequest).toHaveBeenCalledWith({
      body: INBOUND_EVENTS_MALFORMED_PATH_MESSAGE,
    });
  });

  it('reads connector ids from the URL when params are empty', () => {
    const admission = new InboundEventAdmission(admissionConfig);
    const tryAdmit = jest.spyOn(admission, 'tryAdmit');
    const { request } = createRequest({ params: {} });

    const { result } = admit(admission, request, { next: jest.fn().mockReturnValue('next') });
    expect(result).toBe('next');
    expect(tryAdmit).toHaveBeenCalledWith('default\0.slack\0c1');
  });
});
