/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'home']);
  const deployment = getService('deployment');

  describe('Breadcrumbs', function describeIndexTests() {
    it('Home page should render breadcrumbs', async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.header.waitUntilLoadingHasFinished();

      const breadcrumb = await testSubjects.getVisibleText('breadcrumb first last');

      expect(breadcrumb).to.be('Home');
    });

    it('Tutorials directory page should render breadcrumbs', async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');

      expect(firstBreadcrumb).to.be('Integrations');
      expect(lastBreadcrumb).to.be('Sample data');
    });

    it('Tutorials page should render the correct breadcrumbs', async () => {
      const tutorialId = 'apm';

      await PageObjects.common.navigateToUrl('home', `/tutorial/${tutorialId}`, {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');

      expect(firstBreadcrumb).to.be('Integrations');
      expect(lastBreadcrumb).to.be(tutorialId.toUpperCase());
    });

    // The getting started page is only rendered on cloud, and therefore the tests are only run on cloud
    describe('Getting started page', () => {
      let isCloud: boolean;

      before(async () => {
        isCloud = await deployment.isCloud();
      });

      beforeEach(async () => {
        if (isCloud) {
          await PageObjects.common.navigateToUrl('home', '/getting_started', {
            useActualUrl: true,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      });

      it('Getting started page should render breadcrumbs', async () => {
        if (isCloud) {
          const firstBreadcrumb = await testSubjects.getVisibleText('breadcrumb first');
          const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');

          expect(firstBreadcrumb).to.be('Home');
          expect(lastBreadcrumb).to.be('Setup guides');
        }
      });

      it('Home page breadcrumb should navigate to home', async () => {
        if (isCloud) {
          await PageObjects.home.clickHomeBreadcrumb();
          expect(await PageObjects.home.isHomePageDisplayed()).to.be(true);
        }
      });
    });
  });
}
