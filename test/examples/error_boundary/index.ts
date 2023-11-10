/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const log = getService('log');

  describe('Error Boundary Examples', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('errorBoundaryExample');
      await testSubjects.existOrFail('errorBoundaryExampleHeader');
    });

    it('fatal error', async () => {
      log.debug('clicking button for fatal error');
      await testSubjects.click('fatalErrorBtn');
      const errorHeader = await testSubjects.getVisibleText('errorBoundaryFatalHeader');
      expect(errorHeader).to.not.be(undefined);

      log.debug('checking that the error has taken over the page');
      await testSubjects.missingOrFail('errorBoundaryExampleHeader');

      await testSubjects.click('errorBoundaryFatalShowDetailsBtn');
      const errorString = await testSubjects.getVisibleText('errorBoundaryFatalDetailsErrorString');
      expect(errorString).to.match(/Error: Example of unknown error type/);

      log.debug('closing error flyout');
      await testSubjects.click('euiFlyoutCloseButton');

      log.debug('clicking page refresh');
      await testSubjects.click('errorBoundaryFatalPromptReloadBtn');

      await retry.try(async () => {
        log.debug('checking for page refresh');
        await testSubjects.existOrFail('errorBoundaryExampleHeader');
      });
    });

    it('recoverable error', async () => {
      log.debug('clicking button for recoverable error');
      await testSubjects.click('recoverableErrorBtn');
      const errorHeader = await testSubjects.getVisibleText('errorBoundaryRecoverableHeader');
      expect(errorHeader).to.not.be(undefined);

      log.debug('checking that the error has taken over the page');
      await testSubjects.missingOrFail('errorBoundaryExampleHeader');

      log.debug('clicking page refresh');
      await testSubjects.click('errorBoundaryRecoverablePromptReloadBtn');

      await retry.try(async () => {
        log.debug('checking for page refresh');
        await testSubjects.existOrFail('errorBoundaryExampleHeader');
      });
    });
  });
}
