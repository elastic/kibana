/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import {
  ABSOLUTE_DATE_RANGE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_ABSOLUTE_INPUT,
} from '../../lib/url_state';
import { loginAndWaitForPage } from '../../lib/util/helpers';

describe('top-level navigation common to all pages in the SIEM app', () => {
  afterEach(() => {
    logout();
  });

  it('properly sets the start and end dates from the url', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON)
      .first()
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.startTimeFormat);

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON)
      .first()
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.endTimeFormat);
  });

  it('properly sets the url state when start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON)
      .first()
      .click({ force: true });

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${ABSOLUTE_DATE_RANGE.newStartTime},kind:absolute,to:${ABSOLUTE_DATE_RANGE.newEndTime}))`
    );
  });
});
