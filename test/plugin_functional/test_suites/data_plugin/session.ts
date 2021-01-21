/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';
import { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService, getPageObjects }: PluginFunctionalProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'discover', 'timePicker']);
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const esArchiver = getService('esArchiver');

  const getSessionIds = async () => {
    const sessionsBtn = await testSubjects.find('showSessionsButton');
    await sessionsBtn.click();
    const toast = await toasts.getToastElement(1);
    const sessionIds = await toast.getVisibleText();
    return sessionIds.split(',');
  };

  describe('Session management', function describeSessionManagementTests() {
    describe('Discover', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.click('clearSessionsButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      afterEach(async () => {
        await testSubjects.click('clearSessionsButton');
        await toasts.dismissAllToasts();
      });

      it('Starts on index pattern select', async () => {
        await PageObjects.discover.selectIndexPattern('shakespeare');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sessionIds = await getSessionIds();

        // Discover calls destroy on index pattern change, which explicitly closes a session
        expect(sessionIds.length).to.be(2);
        expect(sessionIds[0].length).to.be(0);
        expect(sessionIds[1].length).not.to.be(0);
      });

      it('Starts on a refresh', async () => {
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('Starts a new session on sort', async () => {
        await PageObjects.discover.clickFieldListItemAdd('speaker');
        await PageObjects.discover.clickFieldSort('speaker');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('Starts a new session on filter change', async () => {
        await filterBar.addFilter('line_number', 'is', '4.3.108');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });
    });

    describe('Dashboard', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('../functional/fixtures/es_archiver/dashboard/current/data');
        await esArchiver.loadIfNeeded(
          '../functional/fixtures/es_archiver/dashboard/current/kibana'
        );
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('dashboard with filter');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });

      afterEach(async () => {
        await testSubjects.click('clearSessionsButton');
        await toasts.dismissAllToasts();
      });

      after(async () => {
        await esArchiver.unload('../functional/fixtures/es_archiver/dashboard/current/data');
        await esArchiver.unload('../functional/fixtures/es_archiver/dashboard/current/kibana');
      });

      it('on load there is a single session', async () => {
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('starts a session on refresh', async () => {
        await testSubjects.click('querySubmitButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });

      it('starts a session on filter change', async () => {
        await filterBar.removeAllFilters();
        const sessionIds = await getSessionIds();
        expect(sessionIds.length).to.be(1);
      });
    });
  });
}
