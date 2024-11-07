/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  describe('management plugin', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToActualUrl('management');
    });

    it('should be able to navigate to management test app', async () => {
      await testSubjects.click('test-management');
      await testSubjects.existOrFail('test-management-header');
    });

    it('should be able to navigate within management test app', async () => {
      await testSubjects.click('test-management-link-one');
      await testSubjects.click('test-management-link-basepath');
      await testSubjects.existOrFail('test-management-link-one');
    });

    it('should redirect when app is disabled', async () => {
      await PageObjects.common.navigateToUrl('management', 'data/test-management-disabled', {
        useActualUrl: true,
        shouldUseHashForSubUrl: false,
      });

      await testSubjects.existOrFail('managementHome');
    });
  });
}
