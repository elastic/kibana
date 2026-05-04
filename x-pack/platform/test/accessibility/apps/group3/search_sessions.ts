/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

// Minimal search-session fixtures for the accessibility test. The `search-session` SO type is
// hidden and not importable via the standard SO API, so we use kibanaServer.savedObjects.create.
const SEARCH_SESSIONS = [
  {
    id: 'f36c2cd9-97da-4b4b-a031-74f347a40d8f',
    name: '[eCommerce] Revenue Dashboard',
    status: 'complete',
    appId: 'dashboards',
  },
  {
    id: '4670d40a-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 2',
    status: 'complete',
    appId: 'discover',
  },
  {
    id: 'qq333qq1-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 3',
    status: 'in_progress',
    appId: 'canvas',
  },
  {
    id: 'qq333qq2-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 4',
    status: 'cancelled',
    appId: 'visualize',
  },
  {
    id: 'qq333qq3-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 5',
    status: 'expired',
    appId: 'security',
  },
  {
    id: 'qq433qq4-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 6',
    status: 'error',
    appId: 'graph',
  },
  {
    id: 'qq533qq5-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 7',
    status: 'complete',
    appId: 'lens',
  },
  {
    id: 'qq633qq6-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 8',
    status: 'complete',
    appId: 'apm',
  },
  {
    id: 'qq733qq7-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 9',
    status: 'complete',
    appId: 'appSearch',
  },
  {
    id: 'qq833qq8-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 10',
    status: 'complete',
    appId: 'auditbeat',
  },
  {
    id: 'qq933qq9-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 11',
    status: 'in_progress',
    appId: 'code',
  },
  {
    id: 'q1033q10-cd61-4acc-ae39-06f1a781b3c1',
    name: '[eCommerce] Orders Test 12',
    status: 'in_progress',
    appId: 'console',
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { searchSessionsManagement } = getPageObjects(['searchSessionsManagement']);
  const a11y = getService('a11y');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');

  describe('Search sessions Accessibility', () => {
    before(async () => {
      // SearchSessionService.find filters sessions by the authenticated user's realm + username.
      // The browser logs in as `test_user` (via security.testUserSupertest), so fixtures must
      // carry the same realm fields — fetched here from Kibana's /internal/security/me endpoint.
      const {
        body: {
          authentication_realm: { type: realmType, name: realmName },
          username,
        },
      } = await security.testUserSupertest.get('/internal/security/me').expect(200);

      for (const { id, name, status, appId } of SEARCH_SESSIONS) {
        await kibanaServer.savedObjects.create({
          type: 'search-session',
          id,
          overwrite: true,
          attributes: {
            name,
            status,
            appId,
            created: '2021-02-05T00:00:00.000Z',
            expires: '2021-02-24T00:00:00.000Z',
            idMapping: {},
            sessionId: id,
            version: '8.8.0',
            realmType,
            realmName,
            username,
          },
        });
      }
      await searchSessionsManagement.goTo();
    });

    after(async () => {
      for (const { id } of SEARCH_SESSIONS) {
        await kibanaServer.savedObjects
          .delete({ type: 'search-session', id })
          .catch(() => undefined);
      }
    });

    it('Search sessions management page populated with search sessions meets a11y requirements', async () => {
      await a11y.testAppSnapshot();
    });

    it('Toggle status panel meets a11y requirements', async () => {
      await (await find.byCssSelector('[data-text="Status"]')).click(); // Open the status select
      await a11y.testAppSnapshot();
      await (await find.byCssSelector('[data-text="Status"]')).click(); // Close the status select
    });

    it('Search sessions management toggled on a single status meets a11y requirements ', async () => {
      await (await find.byCssSelector('[data-text="Status"]')).click();
      await (await find.byCssSelector('[title="expired"]')).click();

      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
      await testSubjects.click('clearSearchButton');
    });

    it('App filter panel meets a11y requirements', async () => {
      await (await find.byCssSelector('[data-text="App"]')).click();
      await a11y.testAppSnapshot();
      await (await find.byCssSelector('[data-text="App"]')).click(); // Close the popover
    });

    it('Session management filtered by applications meets a11y requirements', async () => {
      await (await find.byCssSelector('[data-text="App"]')).click();
      await (await find.byCssSelector('[title="dashboards"]')).click();
      await a11y.testAppSnapshot();
    });

    it('Session management more actions panel pop-over meets a111y requirements', async () => {
      await testSubjects.click('sessionManagementActionsCol');
      await a11y.testAppSnapshot();
    });

    it('Session management inspect panel from actions pop-over meets a111y requirements', async () => {
      await testSubjects.click('sessionManagementPopoverAction-inspect');
      await a11y.testAppSnapshot();
    });

    it('Session management edit name panel from actions pop-over meets a11y requirements ', async () => {
      await testSubjects.click('euiFlyoutCloseButton');
      await testSubjects.click('sessionManagementActionsCol');
      await testSubjects.click('sessionManagementPopoverAction-rename');
      await a11y.testAppSnapshot();
      await testSubjects.click('cancelEditName'); // Close the edit name panel
    });

    it('Session management delete panel from actions pop-over meets a11y requirements ', async () => {
      await testSubjects.click('sessionManagementActionsCol');
      await testSubjects.click('sessionManagementPopoverAction-delete');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalCancelButton');
    });
  });
}
