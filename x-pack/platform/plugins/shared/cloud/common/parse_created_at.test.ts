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
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('parses an ISO-8601 timestamp into a Date', () => {
    expect(parseCreatedAt('2026-11-04T14:16:56.000Z', logger)).toEqual(
      new Date('2026-11-04T14:16:56.000Z')
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns undefined and logs an error once when the value cannot be parsed', () => {
    expect(parseCreatedAt('not-a-date', logger)).toBeUndefined();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'cloud.serverless.created_at config value could not be parsed.'
    );
  });
});
