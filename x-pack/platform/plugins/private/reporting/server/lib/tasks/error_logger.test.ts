/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { errorLogger } from './error_logger';

const logger = loggingSystemMock.createLogger();

describe('Execute Report Error Logger', () => {
  const errorLogSpy = jest.spyOn(logger, 'error');

  beforeEach(() => {
    errorLogSpy.mockReset();
  });

  it('cuts off the error message after 1000 characters, and includes the last 1000 characters', () => {
    const longLogSet = new Array(2000);
    for (let i = 0; i < longLogSet.length; i++) {
      longLogSet[i] = `e`; // make a lot of e's
    }
    const longLog = longLogSet.join('');
    const longError = new Error(longLog);

    errorLogger(logger, 'Something went KABOOM!', longError);

    const { message, stack } = errorLogSpy.mock.calls[0][0] as Error;
    expect(message).toMatch(/Something went KABOOM!: Error: e{969}\.\.\.e{1000}$/);
    expect(stack).toEqual(longError.stack);

    const disclaimer = errorLogSpy.mock.calls[1][0] as string;
    expect(disclaimer).toMatchInlineSnapshot(
      `"A partial version of the entire error message was logged. The entire error message length is: 2031 characters."`
    );
  });

  it('does not cut off the error message when shorter than the max', () => {
    const shortLogSet = new Array(100);
    for (let i = 0; i < shortLogSet.length; i++) {
      shortLogSet[i] = `e`; // make a lot of e's
    }
    const shortLog = shortLogSet.join('');
    const shortError = new Error(shortLog);

    errorLogger(logger, 'Something went KABOOM!', shortError);

    const { message, stack } = errorLogSpy.mock.calls[0][0] as Error;
    expect(message).toMatch(/Something went KABOOM!: Error: e{100}$/);
    expect(stack).toEqual(shortError.stack);

    const disclaimer = errorLogSpy.mock.calls[1];
    expect(disclaimer).toBeUndefined();
  });
});
