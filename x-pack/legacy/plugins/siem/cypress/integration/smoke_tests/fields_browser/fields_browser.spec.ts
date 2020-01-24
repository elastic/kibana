/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { drag, drop } from '../../lib/drag_n_drop/helpers';
import {
  clearFieldsBrowser,
  clickOutsideFieldsBrowser,
  openTimelineFieldsBrowser,
  populateTimeline,
  filterFieldsBrowser,
} from '../../lib/fields_browser/helpers';
import {
  FIELDS_BROWSER_CATEGORIES_COUNT,
  FIELDS_BROWSER_CONTAINER,
  FIELDS_BROWSER_FIELDS_COUNT,
  FIELDS_BROWSER_FILTER_INPUT,
  FIELDS_BROWSER_HOST_CATEGORIES_COUNT,
  FIELDS_BROWSER_SELECTED_CATEGORY_COUNT,
  FIELDS_BROWSER_SELECTED_CATEGORY_TITLE,
  FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT,
  FIELDS_BROWSER_TITLE,
} from '../../lib/fields_browser/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../lib/util/helpers';

const defaultHeaders = [
  { id: '@timestamp' },
  { id: 'message' },
  { id: 'event.category' },
  { id: 'event.action' },
  { id: 'host.name' },
  { id: 'source.ip' },
  { id: 'destination.ip' },
  { id: 'user.name' },
];

describe('Fields Browser', () => {
  context('Fields Browser rendering', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      populateTimeline();
      openTimelineFieldsBrowser();
    });

    afterEach(() => {
      clearFieldsBrowser();
    });

    it('renders the fields browser with the expected title when the Fields button is clicked', () => {
      cy.get(FIELDS_BROWSER_TITLE)
        .invoke('text')
        .should('eq', 'Customize Columns');
    });

    it('displays the `default ECS` category (by default)', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE)
        .invoke('text')
        .should('eq', 'default ECS');
    });

    it('the `defaultECS` (selected) category count matches the default timeline header count', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_COUNT)
        .invoke('text')
        .should('eq', `${defaultHeaders.length}`);
    });

    it('displays a checked checkbox for all of the default timeline columns', () => {
      defaultHeaders.forEach(header =>
        cy.get(`[data-test-subj="field-${header.id}-checkbox"]`).should('be.checked')
      );
    });

    it('displays the expected count of categories that match the filter input', () => {
      const filterInput = 'host.mac';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_CATEGORIES_COUNT)
        .invoke('text')
        .should('eq', '2 categories');
    });

    it('displays a search results label with the expected count of fields matching the filter input', () => {
      const filterInput = 'host.mac';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_FILTER_INPUT, { timeout: DEFAULT_TIMEOUT }).should(
        'not.have.class',
        'euiFieldSearch-isLoading'
      );

      cy.get(FIELDS_BROWSER_HOST_CATEGORIES_COUNT)
        .invoke('text')
        .then(hostCategoriesCount => {
          cy.get(FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT)
            .invoke('text')
            .then(systemCategoriesCount => {
              cy.get(FIELDS_BROWSER_FIELDS_COUNT)
                .invoke('text')
                .should('eq', `${+hostCategoriesCount + +systemCategoriesCount} fields`);
            });
        });
    });

    it('displays a count of only the fields in the selected category that match the filter input', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_COUNT)
        .invoke('text')
        .should('eq', '4');
    });
  });

  context('Editing the timeline', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      populateTimeline();
      openTimelineFieldsBrowser();
    });

    afterEach(() => {
      openTimelineFieldsBrowser();
      clearFieldsBrowser();
    });

    it('removes the message field from the timeline when the user un-checks the field', () => {
      const toggleField = 'message';

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'exist'
      );

      cy.get(
        `[data-test-subj="timeline"] [data-test-subj="field-${toggleField}-checkbox"]`
      ).uncheck({
        force: true,
      });

      clickOutsideFieldsBrowser();

      cy.get(FIELDS_BROWSER_CONTAINER).should('not.exist');

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );
    });

    it('selects a search results label with the expected count of categories matching the filter input', () => {
      const category = 'host';

      filterFieldsBrowser(`${category}.`);

      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE)
        .invoke('text')
        .should('eq', category);
    });

    it('adds a field to the timeline when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';
      const toggleField = 'host.geo.city_name';

      filterFieldsBrowser(filterInput);

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );

      cy.get(`[data-test-subj="timeline"] [data-test-subj="field-${toggleField}-checkbox"]`).check({
        force: true,
      });

      clickOutsideFieldsBrowser();

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`, {
        timeout: DEFAULT_TIMEOUT,
      }).should('exist');
    });

    it('adds a field to the timeline when the user drags and drops a field', () => {
      const filterInput = 'host.geo.c';
      const toggleField = 'host.geo.country_name';

      filterFieldsBrowser(filterInput);

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );

      cy.get(
        `[data-test-subj="timeline"] [data-test-subj="field-name-${toggleField}"]`
      ).then(field => drag(field));

      cy.get(`[data-test-subj="timeline"] [data-test-subj="headers-group"]`).then(headersDropArea =>
        drop(headersDropArea)
      );

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`, {
        timeout: DEFAULT_TIMEOUT,
      }).should('exist');
    });

    it('resets all fields in the timeline when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';
      const toggleField = 'host.geo.continent_name';

      filterFieldsBrowser(filterInput);

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );

      cy.get(`[data-test-subj="timeline"] [data-test-subj="field-${toggleField}-checkbox"]`).check({
        force: true,
      });

      clickOutsideFieldsBrowser();

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'exist'
      );

      openTimelineFieldsBrowser();

      cy.get('[data-test-subj="timeline"] [data-test-subj="reset-fields"]').click({ force: true });

      cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );
    });
  });
});
