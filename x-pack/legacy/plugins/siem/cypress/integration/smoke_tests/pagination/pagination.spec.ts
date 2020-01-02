/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import { HOSTS_PAGE_TAB_URLS } from '../../lib/urls';
import {
  AUTHENTICATIONS_TABLE,
  FIVE_ROWS,
  getDraggableField,
  getPageButtonSelector,
  NAVIGATION_AUTHENTICATIONS,
  NAVIGATION_UNCOMMON_PROCESSES,
  NUMBERED_PAGINATION,
  SUPER_DATE_PICKER_APPLY_BUTTON,
  UNCOMMON_PROCESSES_TABLE,
} from '../../lib/pagination/selectors';
import { DEFAULT_TIMEOUT, loginAndWaitForPage, waitForTableLoad } from '../../lib/util/helpers';

describe('Pagination', () => {
  afterEach(() => {
    return logout();
  });

  it('pagination updates results and page number', () => {
    loginAndWaitForPage(HOSTS_PAGE_TAB_URLS.uncommonProcesses);
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);

    cy.get(getPageButtonSelector(0)).should('have.class', 'euiPaginationButton-isActive');

    cy.get(getDraggableField('process.name'))
      .first()
      .invoke('text')
      .then(text1 => {
        cy.get(getPageButtonSelector(1)).click({ force: true });
        // wait for table to be done loading
        waitForTableLoad(UNCOMMON_PROCESSES_TABLE);
        cy.get(getDraggableField('process.name'))
          .first()
          .invoke('text')
          .should(text2 => {
            expect(text1).not.to.eq(text2);
          });
      });
    cy.get(getPageButtonSelector(0)).should('not.have.class', 'euiPaginationButton-isActive');
    cy.get(getPageButtonSelector(1)).should('have.class', 'euiPaginationButton-isActive');
  });

  it('pagination keeps track of page results when tabs change', () => {
    loginAndWaitForPage(HOSTS_PAGE_TAB_URLS.uncommonProcesses);
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);

    cy.get(getPageButtonSelector(0), { timeout: DEFAULT_TIMEOUT }).should(
      'have.class',
      'euiPaginationButton-isActive'
    );
    let thirdPageResult: string;
    cy.get(getPageButtonSelector(1)).click({ force: true });
    // wait for table to be done loading
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);

    cy.get(getDraggableField('process.name'))
      .first()
      .invoke('text')
      .then(text2 => {
        thirdPageResult = `${text2}`;
      });
    cy.get(NAVIGATION_AUTHENTICATIONS).click({ force: true });
    waitForTableLoad(AUTHENTICATIONS_TABLE);
    // check authentications table starts at 1
    cy.get(getPageButtonSelector(0), { timeout: DEFAULT_TIMEOUT }).should(
      'have.class',
      'euiPaginationButton-isActive'
    );

    cy.get(NAVIGATION_UNCOMMON_PROCESSES).click({ force: true });
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);
    cy.get(getPageButtonSelector(1)).should('have.class', 'euiPaginationButton-isActive');
    cy.get(getDraggableField('process.name'))
      .first()
      .invoke('text')
      .should(text1 => {
        expect(text1).to.eq(thirdPageResult);
      });
  });

  /*
   * We only want to comment this code/test for now because it can be nondeterministic
   * when we figure out a way to really mock the data, we should come back to it
   */
  it('pagination resets results and page number to first page when refresh is clicked', () => {
    loginAndWaitForPage(HOSTS_PAGE_TAB_URLS.uncommonProcesses);
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);
    cy.get(NUMBERED_PAGINATION, { timeout: DEFAULT_TIMEOUT });
    cy.get(getPageButtonSelector(0)).should('have.class', 'euiPaginationButton-isActive');
    // let firstResult: string;
    // cy.get(getDraggableField('user.name'))
    //   .first()
    //   .invoke('text')
    //   .then(text1 => {
    //     firstResult = `${text1}`;
    //   });
    cy.get(getPageButtonSelector(1)).click({ force: true });
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);
    cy.get(getPageButtonSelector(0)).should('not.have.class', 'euiPaginationButton-isActive');
    cy.get(SUPER_DATE_PICKER_APPLY_BUTTON)
      .last()
      .click({ force: true });
    waitForTableLoad(UNCOMMON_PROCESSES_TABLE);
    cy.get(getPageButtonSelector(1)).should('have.class', 'euiPaginationButton-isActive');
    // cy.get(getDraggableField('user.name'))
    //   .first()
    //   .invoke('text')
    //   .should(text1 => {
    //     expect(text1).to.eq(firstResult);
    //   });
  });
});
