/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import {
  ABSOLUTE_DATE_RANGE,
  DATE_PICKER_ABSOLUTE_INPUT,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
} from '../../lib/url_state';
import { loginAndWaitForPage } from '../../lib/util/helpers';
import { toggleTimelineVisibility } from '../../lib/timeline/helpers';

describe('top-level navigation common to all pages in the SIEM app', () => {
  afterEach(() => {
    logout();
  });

  it('sets the global start and end dates from the url', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.startTimeFormat);

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.endTimeFormat);
  });

  it('sets the url state when start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 3000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 3000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON).click({ force: true });

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${ABSOLUTE_DATE_RANGE.newStartTime},kind:absolute,to:${ABSOLUTE_DATE_RANGE.newEndTime}))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    toggleTimelineVisibility();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.startTimeFormat);

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.endTimeFormat);
  });

  it('sets the timeline start and end dates independently of the global start and end dates when times are unlocked', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlUnlinked);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.startTimeFormat);

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.endTimeFormat);

    toggleTimelineVisibility();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.startTimeFormatTimeline);

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE)
      .invoke('attr', 'title')
      .should('eq', ABSOLUTE_DATE_RANGE.endTimeFormatTimeline);
  });
});
