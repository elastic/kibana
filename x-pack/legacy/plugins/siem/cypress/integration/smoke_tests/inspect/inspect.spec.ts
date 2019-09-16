/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import { HOSTS_PAGE, HOSTS_PAGE_INSPECTABLE_TABLE_URLS, NETWORK_PAGE } from '../../lib/urls';
import {
  HOST_STATS,
  HOST_TABLE_WRAPPER,
  INSPECT_BUTTON_ICON,
  INSPECT_MODAL,
  NETWORK_INSPECT_TABLES,
  TIMELINE_SETTINGS_ICON,
  TIMELINE_INSPECT_BUTTON,
} from '../../lib/inspect/selectors';
import { DEFAULT_TIMEOUT, loginAndWaitForPage, waitForTableLoad } from '../../lib/util/helpers';
import { executeKQL, hostExistsQuery, toggleTimelineVisibility } from '../../lib/timeline/helpers';
describe('Inspect', () => {
  describe('Hosts Tables', () => {
    afterEach(() => {
      return logout();
    });
    Object.entries(HOSTS_PAGE_INSPECTABLE_TABLE_URLS).map(([key, value]) =>
      it(`inspects the ${key} table`, () => {
        loginAndWaitForPage(value);
        waitForTableLoad();
        cy.get(`${HOST_TABLE_WRAPPER} ${INSPECT_BUTTON_ICON}`).trigger('click', { force: true });

        cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
      })
    );
    HOST_STATS.map(stat =>
      it(`inspects the ${stat.title} stat`, () => {
        loginAndWaitForPage(HOSTS_PAGE);
        waitForTableLoad();
        cy.get(`${stat.id} ${INSPECT_BUTTON_ICON}`).trigger('click', { force: true });
        cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
      })
    );
  });
  describe('Network Tables', () => {
    afterEach(() => {
      return logout();
    });
    NETWORK_INSPECT_TABLES.map(table =>
      it(`inspects the ${table.title} table`, () => {
        loginAndWaitForPage(NETWORK_PAGE);
        waitForTableLoad();
        cy.get(`${table.id} ${INSPECT_BUTTON_ICON}`).trigger('click', { force: true });
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
      cy.get(TIMELINE_INSPECT_BUTTON).should('not.be.disabled', { timeout: DEFAULT_TIMEOUT });
      cy.get(TIMELINE_INSPECT_BUTTON).trigger('click', { force: true });
      cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('be.visible');
    });
  });
});
