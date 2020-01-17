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
  TIMELINE_SETTINGS_ICON,
  TIMELINE_INSPECT_BUTTON,
} from '../../lib/inspect/selectors';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../lib/util/helpers';
import { executeKQL, hostExistsQuery, toggleTimelineVisibility } from '../../lib/timeline/helpers';
import { closesModal, openStatsAndTables } from '../../lib/inspect/helpers';

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
      loginAndWaitForPage(HOSTS_PAGE);
      toggleTimelineVisibility();
      executeKQL(hostExistsQuery);
      cy.get(TIMELINE_SETTINGS_ICON).trigger('click', { force: true });
      cy.get(TIMELINE_INSPECT_BUTTON, { timeout: DEFAULT_TIMEOUT }).should('not.be.disabled');
      cy.get(TIMELINE_INSPECT_BUTTON).trigger('click', { force: true });
      cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
    });
  });
});
