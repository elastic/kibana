/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { EarsRequestError } from './ears_request_error';
import { getEarsErrorLogFields, logEarsEvent } from './log_ears_event';

describe('logEarsEvent', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs success at info with key=value fields and the ears tags', () => {
    logEarsEvent(logger, {
      step: 'token_exchange',
      outcome: 'success',
      connectorId: 'connector-1',
      provider: 'google',
      profileUid: 'u_123',
      spaceId: 'default',
      state: 'state-abc',
      earsRequestId: 'req-1',
    });

    expect(logger.info).toHaveBeenCalledWith(
      'EARS token_exchange success: connectorId=connector-1 provider=google profileUid=u_123 spaceId=default state=state-abc earsRequestId=req-1',
      { tags: ['ears', 'token_exchange', 'success'] }
    );
  });

  it('logs failure at warn by default, since callers already log an error', () => {
    logEarsEvent(logger, {
      step: 'token_refresh',
      outcome: 'failure',
      connectorId: 'connector-1',
      status: 502,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'EARS token_refresh failure: connectorId=connector-1 status=502',
      { tags: ['ears', 'token_refresh', 'failure'] }
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('omits undefined fields and includes extra fields', () => {
    logEarsEvent(logger, {
      step: 'execute',
      outcome: 'success',
      connectorId: 'connector-1',
      profileUid: undefined,
      executionId: 'exec-1',
      extra: { actionTypeId: '.google_drive', skipped: undefined },
    });

    expect(logger.info).toHaveBeenCalledWith(
      'EARS execute success: connectorId=connector-1 executionId=exec-1 actionTypeId=.google_drive',
      { tags: ['ears', 'execute', 'success'] }
    );
  });
});

describe('logEarsEvent value sanitization', () => {
  const logger = loggerMock.create();

  beforeEach(() => jest.clearAllMocks());

  const loggedMessage = (extra: Record<string, string>) => {
    logEarsEvent(logger, { step: 'token_refresh', outcome: 'failure', connectorId: 'c1', extra });
    return (logger.warn as jest.Mock).mock.calls[0][0] as string;
  };

  it('quotes values that could forge extra fields', () => {
    expect(loggedMessage({ reason: 'timeout profileUid=attacker' })).toBe(
      'EARS token_refresh failure: connectorId=c1 reason="timeout profileUid=attacker"'
    );
  });

  it('replaces newlines and other control characters', () => {
    const message = loggedMessage({ reason: 'first\nsecond\u0000third' });
    expect(message).not.toMatch(/[\n\u0000]/);
    expect(message).toContain('reason="first second third"');
  });

  it('truncates long values', () => {
    const message = loggedMessage({ reason: 'x'.repeat(1000) });
    expect(message.length).toBeLessThan(300);
    expect(message).toContain('…');
  });

  it('quotes empty values', () => {
    expect(loggedMessage({ reason: '' })).toContain('reason=""');
  });
});

describe('getEarsErrorLogFields', () => {
  it('returns status and request id for an EARS response error', () => {
    expect(
      getEarsErrorLogFields(
        new EarsRequestError({ message: 'x', status: 502, earsRequestId: 'r1' })
      )
    ).toEqual({ earsRequestId: 'r1', status: 502 });
  });

  it('returns the message as reason for other errors', () => {
    expect(getEarsErrorLogFields(new Error('timeout'))).toEqual({ extra: { reason: 'timeout' } });
    expect(getEarsErrorLogFields('boom')).toEqual({ extra: { reason: 'boom' } });
  });
});
