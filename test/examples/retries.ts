/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { FtrProviderContext } from '../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  describe('Retry', () => {
    describe('Svc methods', () => {
      it(`'waitFor' should not print out attempt counts`, async () => {
        await retry.waitFor('some waitFor description ', async () => {
          return await testSubjects.exists('waitFor');
        });
      });
      it(`'tryWithRetries' should log out the attempt counts`, async () => {
        await retry.tryWithRetries(
          'some tryWithRetries description',
          async () => {
            throw new Error('some tryWithRetries error');
          },
          { retryCount: 5, retryDelay: 50 }
        );
      });
      it(`'waitForWithTimeout' should not print out attempt counts`, async () => {
        await retry.waitForWithTimeout('some waitForWithTimeout description', 6000, async () => {
          return await testSubjects.exists('waitForWithTimeout');
        });
      });
      it(`'tryForTime' should not print out attempt counts`, async () => {
        await retry.tryForTime(6000, async () => {
          await testSubjects.exists('tryForTime');
        });
      });
    });
  });
};
