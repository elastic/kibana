/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  INSPECT_HOSTS_BUTTONS_IN_SIEM,
  INSPECT_MODAL,
  INSPECT_NETWORK_BUTTONS_IN_SIEM,
} from '../screens/inspect';

import { closesModal, openStatsAndTables } from '../tasks/inspect';
import { loginAndWaitForPage } from '../tasks/login';
import { openTimeline } from '../tasks/siem_main';
import {
  executeTimelineKQL,
  openTimelineInspectButton,
  openTimelineSettings,
} from '../tasks/timeline';

import { HOSTS_PAGE, NETWORK_PAGE } from '../urls/navigation';

describe('Inspect', () => {
  context('Hosts stats and tables', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
    });
    afterEach(() => {
      closesModal();
    });

    INSPECT_HOSTS_BUTTONS_IN_SIEM.forEach((table) =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });

  context('Network stats and tables', () => {
    before(() => {
      loginAndWaitForPage(NETWORK_PAGE);
    });
    afterEach(() => {
      closesModal();
    });

    INSPECT_NETWORK_BUTTONS_IN_SIEM.forEach((table) =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL).should('be.visible');
      })
    );
  });

  context('Timeline', () => {
    it('inspects the timeline', () => {
      const hostExistsQuery = 'host.name: *';
      loginAndWaitForPage(HOSTS_PAGE);
      openTimeline();
      executeTimelineKQL(hostExistsQuery);
      openTimelineSettings();
      openTimelineInspectButton();
      cy.get(INSPECT_MODAL).should('be.visible');
    });
  });
});
