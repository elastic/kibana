/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { loggerMock } from '@kbn/logging-mocks';
import { parseCreatedAt } from './parse_created_at';

describe('parseCreatedAt', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('returns undefined without logging when the value is not set', () => {
    expect(parseCreatedAt(undefined, logger)).toBeUndefined();
    expect(parseCreatedAt('', logger)).toBeUndefined();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('parses an ISO-8601 timestamp into a Date', () => {
    expect(parseCreatedAt('2026-11-04T14:16:56.000Z', logger)).toEqual(
      new Date('2026-11-04T14:16:56.000Z')
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('accepts a UTC offset in place of Z', () => {
    expect(parseCreatedAt('2026-11-04T09:16:56.000-05:00', logger)).toEqual(
      new Date('2026-11-04T14:16:56.000Z')
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it.each(['not-a-date', '1', '2026', '2026-11-04', 'Nov 4 2026', '2026-11-04T14:16:56'])(
    'returns undefined and logs a warning once for %p, which is not an ISO-8601 timestamp with a time zone',
    (value) => {
      expect(parseCreatedAt(value, logger)).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        `cloud.serverless.created_at config value "${value}" could not be parsed as an ISO-8601 timestamp with a time zone; ignoring it.`
      );
    }
  );

  it.each([
    '2026-13-45T00:00:00Z',
    '2026-02-29T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-11-04T24:00:00Z',
    '2026-11-04T14:60:00Z',
    '2026-11-04T14:16:60Z',
    '2026-11-04T14:16:56+24:00',
    '2026-11-04T14:16:56+05:60',
  ])('rejects the well-formed timestamp %p that is not a real date or time', (value) => {
    expect(parseCreatedAt(value, logger)).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('accepts 29 February in a leap year', () => {
    expect(parseCreatedAt('2028-02-29T00:00:00Z', logger)).toEqual(
      new Date('2028-02-29T00:00:00.000Z')
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
