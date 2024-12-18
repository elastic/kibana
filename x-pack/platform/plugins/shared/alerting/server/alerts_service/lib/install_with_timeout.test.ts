/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging-mocks';

import { installWithTimeout } from './install_with_timeout';
import { ReplaySubject, Subject } from 'rxjs';

const logger = loggerMock.create();

describe('installWithTimeout', () => {
  let pluginStop$: Subject<void>;

  beforeEach(() => {
    jest.resetAllMocks();
    pluginStop$ = new ReplaySubject(1);
  });

  it(`should call installFn`, async () => {
    await installWithTimeout({
      installFn: async () => {
        logger.info(`running`);
      },
      pluginStop$,
      logger,
      timeoutMs: 10,
    });
    expect(logger.info).toHaveBeenCalled();
  });

  it(`should short-circuit installFn if it exceeds configured timeout`, async () => {
    await expect(() =>
      installWithTimeout({
        installFn: async () => {
          await new Promise((r) => setTimeout(r, 20));
          logger.info(`running`);
        },
        pluginStop$,
        logger,
        timeoutMs: 10,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failure during installation. Timeout: it took more than 10ms"`
    );
    expect(logger.info).not.toHaveBeenCalled();
  });

  it(`should short-circuit installFn if pluginStop$ signal is received`, async () => {
    pluginStop$.next();
    await expect(() =>
      installWithTimeout({
        installFn: async () => {
          await new Promise((r) => setTimeout(r, 5));
          logger.info(`running`);
        },
        pluginStop$,
        logger,
        timeoutMs: 10,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Server is stopping; must stop all async operations"`
    );
    expect(logger.info).not.toHaveBeenCalled();
  });
});
