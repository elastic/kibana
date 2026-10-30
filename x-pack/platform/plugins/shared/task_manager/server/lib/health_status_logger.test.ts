/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHealthStatusLogger } from './health_status_logger';
import { mockLogger } from '../test_utils';

describe('createHealthStatusLogger', () => {
  test('passes standard Logger methods through', () => {
    const logger = mockLogger();
    const healthStatusLogger = createHealthStatusLogger(logger);
    const error = new Error('boom');

    healthStatusLogger.info('info message');
    healthStatusLogger.warn('warn message');
    healthStatusLogger.error(error);

    expect(logger.info).toHaveBeenCalledWith('info message', undefined);
    expect(logger.warn).toHaveBeenCalledWith('warn message', undefined);
    expect(logger.error).toHaveBeenCalledWith(error, undefined);
  });
});
