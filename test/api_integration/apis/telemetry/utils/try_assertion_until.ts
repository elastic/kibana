/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A helper function to retry an assertion multiple times before failing the test.
 *
 * @param subject async function to invoke for assertion.
 * @param assertion assertion function; throw error or return false on fail assertion.
 * @param numAttempts number of times to attempt before completely failing. (must be >= 1 - default 3)
 * @param waitTimeMs time in ms to wait before attempting the next retry. (default none)
 */
export async function tryAssertionUntil<R>(
  subject: () => Promise<R>,
  assertion: (result: void | R, error?: Error) => false | void,
  numAttempts: number = 3,
  waitTimeMs?: number
) {
  if (numAttempts < 1) {
    throw Error(`Exepcting to at least attempt subject 1 time.`);
  }

  const attempts = Array.from({ length: numAttempts }, (_, i) => i + 1);
  const subjcetErrors: Error[] = [];
  for await (const attempt of attempts) {
    try {
      const subjectResult = await subject();
      const assertResult = assertion(subjectResult);
      if (assertResult === false) {
        throw Error(`Attempt #${attempt} didnt meet acceptance criteria.`);
      }

      return;
    } catch (err) {
      subjcetErrors.push(err.message);

      if (attempt === numAttempts) {
        throw new Error(
          `Assertion failed after ${numAttempts} attempts:\n` +
            JSON.stringify(subjcetErrors, null, 2)
        );
      }

      if (typeof waitTimeMs === 'number') {
        await new Promise((res) => setTimeout(res, waitTimeMs));
      }
    }
  }
}
