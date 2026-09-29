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

  it('clear re-arms a warnThenDebug key', () => {
    const logger = loggingSystemMock.createLogger();
    const logOnce = createLogOnce(logger);

    logOnce.warnThenDebug('fetch', 'down');
    logOnce.warnThenDebug('fetch', 'still down');
    logOnce.clear('fetch');
    logOnce.warnThenDebug('fetch', 'down again');

    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenNthCalledWith(2, 'down again');
  });

  it('drops keys of the oldest catalogVersion after a third catalogVersion', () => {
    const logger = loggingSystemMock.createLogger();
    const logOnce = createLogOnce(logger, { keepCatalogVersions: 2 });

    logOnce.warn('v1', 'a', 'v1');
    logOnce.warn('v2', 'a', 'v2');
    logOnce.warn('v3', 'a', 'v3');
    logOnce.warn('v2', 'a', 'v2-repeat');
    logOnce.warn('v1', 'a', 'v1-again');

    expect(logger.warn).toHaveBeenCalledTimes(4);
    expect(logger.debug).toHaveBeenCalledWith('v2-repeat');
    expect(logger.warn).toHaveBeenNthCalledWith(4, 'v1-again');
  });
});
