/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { KibanaRequest, OnPreResponseToolkit } from '@kbn/core/server';

import { INBOUND_EVENTS_API_PATH } from './constants';
import { recordOversizedInboundEvent } from './register_inbound_event_admission';

const createRequest = ({
  method = 'post',
  path = '/api/actions/events/.inboundWebhook/c1',
  routePath = INBOUND_EVENTS_API_PATH,
}: {
  method?: 'post' | 'get';
  path?: string;
  routePath?: string;
} = {}) =>
  ({
    id: 'req-1',
    route: { method, path, routePath },
  } as unknown as KibanaRequest);

describe('recordOversizedInboundEvent', () => {
  const logger = loggingSystemMock.createLogger();
  const next = jest.fn().mockReturnValue({ type: 'next' });
  const toolkit = { next } as unknown as OnPreResponseToolkit;
  const getSpaceId = jest.fn().mockReturnValue('default');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs and counts a 413 on the inbound route, then continues', () => {
    const result = recordOversizedInboundEvent({
      request: createRequest(),
      preResponse: { statusCode: 413 },
      toolkit,
      logger,
      getSpaceId,
    });

    expect(result).toEqual({ type: 'next' });
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        'outcome=payload_too_large spaceId=default connectorId=c1 connectorTypeId=.inboundWebhook'
      ),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          outcome: 'payload_too_large',
          detail: 'body_exceeds_max_bytes',
          requestId: 'req-1',
        }),
      })
    );
  });

  it('leaves a 413 on another route uncounted', () => {
    recordOversizedInboundEvent({
      request: createRequest({ routePath: '/api/actions/connector' }),
      preResponse: { statusCode: 413 },
      toolkit,
      logger,
      getSpaceId,
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('leaves a successful inbound response uncounted', () => {
    recordOversizedInboundEvent({
      request: createRequest(),
      preResponse: { statusCode: 202 },
      toolkit,
      logger,
      getSpaceId,
    });

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('records unknown ids when the path cannot be read, and unknown space when space lookup throws', () => {
    getSpaceId.mockImplementation(() => {
      throw new Error('no space');
    });

    recordOversizedInboundEvent({
      request: createRequest({ path: '/api/actions/events/%E0%A4%A/c1' }),
      preResponse: { statusCode: 413 },
      toolkit,
      logger,
      getSpaceId,
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('spaceId=unknown connectorId=unknown connectorTypeId=unknown'),
      expect.anything()
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('no space'));
  });
});
