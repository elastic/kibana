/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { INBOUND_INGRESS_OUTCOMES, logInboundIngressOutcome } from './log_inbound_ingress_outcome';

describe('logInboundIngressOutcome', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('covers the full outcome taxonomy', () => {
    expect(INBOUND_INGRESS_OUTCOMES).toEqual([
      'disabled',
      'no_spec',
      'load_miss',
      'auth_fail',
      'handle_fail',
      'validate_fail',
      'emit_partial',
      'identity_missing',
      'http_ack',
      'accepted',
    ]);
  });

  it('logs accepted at info with stable fields', () => {
    logInboundIngressOutcome(logger, {
      outcome: 'accepted',
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.myConnector',
      requestId: 'req-1',
    });
    expect(logger.info).toHaveBeenCalledWith(
      'Inbound events outcome=accepted spaceId=default connectorId=c1 connectorTypeId=.myConnector requestId=req-1',
      {
        tags: ['inbound_events', 'accepted'],
        inboundEvents: {
          outcome: 'accepted',
          spaceId: 'default',
          connectorId: 'c1',
          connectorTypeId: '.myConnector',
          requestId: 'req-1',
        },
      }
    );
  });

  it('logs auth_fail at debug', () => {
    logInboundIngressOutcome(logger, {
      outcome: 'auth_fail',
      spaceId: 'space-a',
      connectorId: 'c1',
      connectorTypeId: '.myConnector',
    });
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('outcome=auth_fail'),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({ outcome: 'auth_fail', spaceId: 'space-a' }),
      })
    );
  });

  it('logs handle_fail at error with detail', () => {
    logInboundIngressOutcome(logger, {
      outcome: 'handle_fail',
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.myConnector',
      detail: 'handler failed',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('detail=handler failed'),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          outcome: 'handle_fail',
          detail: 'handler failed',
        }),
      })
    );
  });
});
