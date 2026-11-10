/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { inboundEventsRequestCounter, inboundEventsRequestResult } from './inbound_events_metrics';
import { INBOUND_INGRESS_OUTCOMES, logInboundIngressOutcome } from './log_inbound_ingress_outcome';

describe('inbound events request counter', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.spyOn(inboundEventsRequestCounter, 'add').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps every ingress outcome onto accept or a reject reason', () => {
    expect(
      INBOUND_INGRESS_OUTCOMES.map((outcome) => [outcome, inboundEventsRequestResult(outcome)])
    ).toEqual([
      ['disabled', 'other'],
      ['no_spec', 'other'],
      ['load_miss', 'other'],
      ['auth_fail', 'auth'],
      ['handle_fail', 'other'],
      ['validate_fail', 'other'],
      ['emit_partial', 'schedule'],
      ['identity_missing', 'schedule'],
      ['http_ack', 'accepted'],
      ['accepted', 'accepted'],
      ['rate_limited', 'throttle'],
      ['payload_too_large', 'size'],
    ]);
  });

  it('counts a logged outcome once', () => {
    logInboundIngressOutcome(logger, {
      outcome: 'auth_fail',
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
    });

    expect(inboundEventsRequestCounter.add).toHaveBeenCalledTimes(1);
    expect(inboundEventsRequestCounter.add).toHaveBeenCalledWith(1, { result: 'auth' });
  });
});
