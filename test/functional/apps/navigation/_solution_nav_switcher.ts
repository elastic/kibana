/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'discover', 'dashboard']);
  const testSubjects = getService('testSubjects');
  const navigation = getService('globalNav');

  describe('solution navigation switcher', function describeIndexTests() {
    it('should be able to switch between solutions', async () => {
      await PageObjects.common.navigateToApp('discover');

      // Default to "search" solution
      await testSubjects.existOrFail('searchSideNav');
      await testSubjects.missingOrFail('observabilitySideNav');

      // Change to "observability" solution
      await navigation.changeSolutionNavigation('oblt');
      await testSubjects.existOrFail('observabilitySideNav');
      await testSubjects.missingOrFail('searchSideNav');
    });

    it('should contain links to manage deployment and view all deployments', async () => {
      await PageObjects.common.navigateToApp('discover');

      await navigation.openSolutionNavSwitcher();

      await testSubjects.existOrFail('manageDeploymentBtn', { timeout: 2000 });
      await testSubjects.existOrFail('viewDeploymentsBtn', { timeout: 2000 });
    });
  });
}
