/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_ABSOLUTE_INPUT,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
} from '../screens/date_picker';

export const setEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear().type(date);
};

export const setStartDate = (date: string) => {
  cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).clear().type(date);
};

export const setTimelineEndDate = (date: string) => {
  cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click({ force: true });
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    // @ts-ignore
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click({ force: true });
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const setTimelineStartDate = (date: string) => {
  cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).click({
    force: true,
  });

  cy.get(DATE_PICKER_ABSOLUTE_TAB).first().click({ force: true });

  cy.get(DATE_PICKER_ABSOLUTE_INPUT).click({ force: true });
  cy.get(DATE_PICKER_ABSOLUTE_INPUT).then(($el) => {
    // @ts-ignore
    if (Cypress.dom.isAttached($el)) {
      cy.wrap($el).click({ force: true });
    }
    cy.wrap($el).type(`{selectall}{backspace}${date}{enter}`);
  });
};

export const updateDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON)
    .click({ force: true })
    .invoke('text')
    .should('not.equal', 'Updating');
};

export const updateTimelineDates = () => {
  cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE)
    .click({ force: true })
    .invoke('text')
    .should('not.equal', 'Updating');
};
