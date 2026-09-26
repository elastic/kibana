/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createLogOnce } from './log_once';

describe('createLogOnce', () => {
  it('logs a warning once per catalogVersion:cause and debugs repeats', () => {
    const logger = loggingSystemMock.createLogger();
    const logOnce = createLogOnce(logger);

    logOnce.warn('v1', 'hash_mismatch', 'first');
    logOnce.warn('v1', 'hash_mismatch', 'repeat');
    logOnce.warn('v1', 'other', 'other-cause');
    logOnce.warn('v2', 'hash_mismatch', 'new-version');

    expect(logger.warn).toHaveBeenCalledTimes(3);
    expect(logger.debug).toHaveBeenCalledWith('repeat');
  });

  it('warns once for a fetch failure then debugs until a new key', () => {
    const logger = loggingSystemMock.createLogger();
    const logOnce = createLogOnce(logger);

    logOnce.warnThenDebug('fetch', 'down');
    logOnce.warnThenDebug('fetch', 'still down');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith('still down');
  });
});
