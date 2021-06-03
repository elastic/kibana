/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * It's a JS file because we cannot use Jest types in here because of a clash in the `expect` types
 */

import { tryAssertionUntil } from './try_assertion_until';

describe(`tryAssertionUntil`, () => {
  test('attempts only once on first success', async () => {
    const subject = jest.fn().mockResolvedValue();
    const assertion = jest.fn();

    await tryAssertionUntil(subject, assertion, 3);
    expect(subject).toBeCalledTimes(1);
    expect(assertion).toBeCalledTimes(1);
  });

  test('exhausts all attempts before failing when assertion fails', async () => {
    let attemptNumber = 0;
    const subject = jest.fn().mockResolvedValue();
    const assertion = jest.fn().mockImplementation(() => {
      attemptNumber++;
      throw new Error(`assertion error: ${attemptNumber}`);
    });
    let error;

    try {
      await tryAssertionUntil(subject, assertion, 3);
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`
      "Assertion failed after 3 attempts:
      [
        \\"assertion error: 1\\",
        \\"assertion error: 2\\",
        \\"assertion error: 3\\"
      ]"
    `);

    expect(subject).toBeCalledTimes(3);
    expect(assertion).toBeCalledTimes(3);
  });

  test('exhausts all attempts before failing when subject fails', async () => {
    let attemptNumber = 0;
    const subject = jest.fn().mockImplementation(() => {
      attemptNumber++;
      throw new Error(`subject error: ${attemptNumber}`);
    });
    const assertion = jest.fn().mockResolvedValue();
    let error;

    try {
      await tryAssertionUntil(subject, assertion, 3);
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`
      "Assertion failed after 3 attempts:
      [
        \\"subject error: 1\\",
        \\"subject error: 2\\",
        \\"subject error: 3\\"
      ]"
    `);

    expect(subject).toBeCalledTimes(3);
    expect(assertion).toBeCalledTimes(0);
  });

  test('keeps attempting until success', async () => {
    const subject = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('subject error');
      })
      .mockResolvedValue('entry');

    const assertion = jest
      .fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true);

    let error;

    try {
      await tryAssertionUntil(subject, assertion, 20);
    } catch (err) {
      error = err;
    }

    expect(error).toStrictEqual(undefined);
    expect(subject).toBeCalledTimes(3);
    expect(assertion).toBeCalledTimes(2);
  });

  test('passes subject resolved value to assertion', async () => {
    const subject = jest.fn().mockResolvedValue('mock Subject return');
    const assertion = jest.fn().mockImplementationOnce(() => true);

    let error;

    try {
      await tryAssertionUntil(subject, assertion);
    } catch (err) {
      error = err;
    }

    expect(error).toStrictEqual(undefined);
    expect(subject).toBeCalledTimes(1);
    expect(assertion).toBeCalledTimes(1);
    expect(assertion).toBeCalledWith('mock Subject return');
  });

  test('throws if number of attempts is set to 0', async () => {
    const subject = jest.fn().mockResolvedValue('entry');

    const assertion = jest
      .fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true);

    let error;

    try {
      await tryAssertionUntil(subject, assertion, 0);
    } catch (err) {
      error = err;
    }

    expect(error.message).toMatchInlineSnapshot(`"Number of attempts must be at greater than 1."`);
    expect(subject).toBeCalledTimes(0);
    expect(assertion).toBeCalledTimes(0);
  });
});
