/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_INPUT,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
} from '../screens/calendar';

import { DEFAULT_TIMEOUT } from '../tasks/login';

export const setStartDate = (date: string) => {
  cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB)
    .first()
    .click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT })
    .clear()
    .type(date);
};

export const setEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB)
    .first()
    .click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT })
    .clear()
    .type(date);
};

export const updateDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON, { timeout: DEFAULT_TIMEOUT })
    .click({ force: true })
    .invoke('text', { timeout: DEFAULT_TIMEOUT })
    .should('not.equal', 'Updating');
};

export const setTimelineStartDate = (date: string) => {
  cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE, { timeout: DEFAULT_TIMEOUT }).click({
    force: true,
  });

  cy.get(DATE_PICKER_ABSOLUTE_TAB)
    .first()
    .click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT }).type(
    `{selectall}{backspace}${date}{enter}`
  );
};

export const setTimelineEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB)
    .first()
    .click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT }).type(
    `{selectall}{backspace}${date}{enter}`
  );
};

export const updateTimelineDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click({ force: true });
};
