/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE, NETWORK_PAGE } from '../../lib/urls';
import {
  INSPECT_MODAL,
  INSPECT_NETWORK_BUTTONS_IN_SIEM,
  INSPECT_HOSTS_BUTTONS_IN_SIEM,
} from '../../../screens/inspect';
import {
  executeTimelineKQL,
  openTimelineSettings,
  openTimelineInspectButton,
} from '../../../tasks/timeline/main';
import { openTimeline } from '../../../tasks/siem_main';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../../tasks/login';
import { closesModal, openStatsAndTables } from '../../../tasks/inspect';

describe('Inspect', () => {
  context('Hosts stats and tables', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
    });
    afterEach(() => {
      closesModal();
    });

    INSPECT_HOSTS_BUTTONS_IN_SIEM.forEach(table =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
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

    INSPECT_NETWORK_BUTTONS_IN_SIEM.forEach(table =>
      it(`inspects the ${table.title}`, () => {
        openStatsAndTables(table);
        cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
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
      cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
    });
  });
});
