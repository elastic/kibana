/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import { HOSTS_PAGE } from '../../lib/urls';
import {
  INSPECT_BUTTON_ICON,
  INSPECT_MODAL,
  INSPECT_BUTTONS_IN_SIEM,
  TIMELINE_SETTINGS_ICON,
  TIMELINE_INSPECT_BUTTON,
} from '../../lib/inspect/selectors';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../lib/util/helpers';
import { executeKQL, hostExistsQuery, toggleTimelineVisibility } from '../../lib/timeline/helpers';

describe('Inspect', () => {
  describe('Hosts and network stats and tables', () => {
    afterEach(() => {
      return logout();
    });
    INSPECT_BUTTONS_IN_SIEM.map(table =>
      it(`inspects the ${table.title}`, () => {
        loginAndWaitForPage(table.url);
        cy.get(table.id, { timeout: DEFAULT_TIMEOUT });
        if (table.altInspectId) {
          cy.scrollTo('bottom');
          cy.get(table.altInspectId, { timeout: DEFAULT_TIMEOUT }).trigger('click', {
            force: true,
          });
        } else {
          cy.scrollTo('bottom');
          cy.get(`${table.id} ${INSPECT_BUTTON_ICON}`, {
            timeout: DEFAULT_TIMEOUT,
          }).trigger('click', { force: true });
        }
        cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
      })
    );
  });

  describe('Timeline', () => {
    afterEach(() => {
      return logout();
    });

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
