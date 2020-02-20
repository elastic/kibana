/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE } from '../../lib/urls';

import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../../tasks/login';

import {
  FIELDS_BROWSER_TITLE,
  FIELDS_BROWSER_SELECTED_CATEGORY_TITLE,
  FIELDS_BROWSER_SELECTED_CATEGORY_COUNT,
  FIELDS_BROWSER_CATEGORIES_COUNT,
  FIELDS_BROWSER_HOST_CATEGORIES_COUNT,
  FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT,
  FIELDS_BROWSER_FIELDS_COUNT,
  FIELDS_BROWSER_MESSAGE_HEADER,
  FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER,
  FIELDS_BROWSER_HOST_GEO_COUNTRY_NAME_HEADER,
  FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER,
} from '../../../screens/timeline/fields_browser';

import { populateTimeline, openTimelineFieldsBrowser } from '../../../tasks/timeline/main';

import { openTimeline } from '../../../tasks/siem_main';

import {
  clearFieldsBrowser,
  filterFieldsBrowser,
  closeFieldsBrowser,
  removesMessageField,
  addsHostGeoCityNameToTimeline,
  addsHostGeoCountryNameToTimelineDraggingIt,
  addsHostGeoContinentNameToTimeline,
  resetFields,
} from '../../../tasks/timeline/fields_browser';

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
      openTimeline();
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

      cy.get(FIELDS_BROWSER_CATEGORIES_COUNT, { timeout: DEFAULT_TIMEOUT })
        .invoke('text')
        .should('eq', '2 categories');
    });

    it('displays a search results label with the expected count of fields matching the filter input', () => {
      const filterInput = 'host.mac';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_HOST_CATEGORIES_COUNT)
        .invoke('text')
        .then(hostCategoriesCount => {
          cy.get(FIELDS_BROWSER_SYSTEM_CATEGORIES_COUNT)
            .invoke('text')
            .then(systemCategoriesCount => {
              cy.get(FIELDS_BROWSER_FIELDS_COUNT, { timeout: DEFAULT_TIMEOUT })
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
      openTimeline();
      populateTimeline();
      openTimelineFieldsBrowser();
    });

    afterEach(() => {
      openTimelineFieldsBrowser();
      clearFieldsBrowser();
    });

    it('removes the message field from the timeline when the user un-checks the field', () => {
      cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('exist');

      removesMessageField();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_MESSAGE_HEADER).should('not.exist');
    });

    it('selects a search results label with the expected count of categories matching the filter input', () => {
      const category = 'host';
      filterFieldsBrowser(category);

      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE)
        .invoke('text')
        .should('eq', category);
    });

    it('adds a field to the timeline when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER).should('not.exist');
      addsHostGeoCityNameToTimeline();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_HOST_GEO_CITY_NAME_HEADER, {
        timeout: DEFAULT_TIMEOUT,
      }).should('exist');
    });

    it('adds a field to the timeline when the user drags and drops a field', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_HOST_GEO_COUNTRY_NAME_HEADER).should('not.exist');

      addsHostGeoCountryNameToTimelineDraggingIt();

      cy.get(FIELDS_BROWSER_HOST_GEO_COUNTRY_NAME_HEADER, {
        timeout: DEFAULT_TIMEOUT,
      }).should('exist');
    });

    it('resets all fields in the timeline when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');

      addsHostGeoContinentNameToTimeline();
      closeFieldsBrowser();

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('exist');

      openTimelineFieldsBrowser();
      resetFields();

      cy.get(FIELDS_BROWSER_HEADER_HOST_GEO_CONTINENT_NAME_HEADER).should('not.exist');
    });
  });
});
