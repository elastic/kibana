/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { filterFieldsBrowser } from '../../lib/fields_browser/helpers';
import {
  FIELDS_BROWSER_CONTAINER,
  FIELDS_BROWSER_SELECTED_CATEGORY_TITLE,
  FIELDS_BROWSER_TITLE,
} from '../../lib/fields_browser/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../lib/util/helpers';
import {
  clickOutsideFieldsBrowser,
  openEventsViewerFieldsBrowser,
  filterSearchBar,
} from '../../lib/events_viewer/helpers';
import {
  CLOSE_MODAL,
  EVENTS_VIEWER_PANEL,
  HEADER_SUBTITLE,
  INSPECT_MODAL,
  INSPECT_QUERY,
  LOAD_MORE,
  LOCAL_EVENTS_COUNT,
} from '../../lib/events_viewer/selectors';
import { SERVER_SIDE_EVENT_COUNT } from '../../lib/timeline/selectors';
import { clickEventsTab } from '../../lib/hosts/helpers';

const defaultHeadersInDefaultEcsCategory = [
  { id: '@timestamp' },
  { id: 'message' },
  { id: 'host.name' },
  { id: 'event.action' },
  { id: 'user.name' },
  { id: 'source.ip' },
  { id: 'destination.ip' },
];

describe('Events Viewer', () => {
  context('Fields rendering', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      clickEventsTab();
    });

    it('renders the fields browser with the expected title when the Events Viewer Fields Browser button is clicked', () => {
      openEventsViewerFieldsBrowser();

      cy.get(FIELDS_BROWSER_TITLE)
        .invoke('text')
        .should('eq', 'Customize Columns');
    });

    it('displays the `default ECS` category (by default)', () => {
      cy.get(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE)
        .invoke('text')
        .should('eq', 'default ECS');
    });

    it('displays a checked checkbox for all of the default events viewer columns that are also in the default ECS category', () => {
      openEventsViewerFieldsBrowser();

      defaultHeadersInDefaultEcsCategory.forEach(header =>
        cy.get(`[data-test-subj="field-${header.id}-checkbox"]`).should('be.checked')
      );
    });
  });

  context('Events viewer behaviour', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      clickEventsTab();
    });

    it('launches the inspect query modal when the inspect button is clicked', () => {
      // wait for data to load
      cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
        .should('exist')
        .invoke('text', { timeout: DEFAULT_TIMEOUT })
        .should('not.equal', '0');

      cy.get(INSPECT_QUERY, { timeout: DEFAULT_TIMEOUT })
        .should('exist')
        .trigger('mousemove', { force: true })
        .click({ force: true });

      cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('exist');
    });

    it('closes the inspect query modal when the user clicks outside of it', () => {
      cy.get(CLOSE_MODAL).click();
      cy.get(INSPECT_MODAL, { timeout: DEFAULT_TIMEOUT }).should('not.exist');
    });

    it('adds a field to the events viewer when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';
      const toggleField = 'host.geo.city_name';

      openEventsViewerFieldsBrowser();

      filterFieldsBrowser(filterInput);

      cy.get(`${EVENTS_VIEWER_PANEL} [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );

      cy.get(`${EVENTS_VIEWER_PANEL} [data-test-subj="field-${toggleField}-checkbox"]`).check({
        force: true,
      });

      clickOutsideFieldsBrowser();

      cy.get(`${EVENTS_VIEWER_PANEL} [data-test-subj="header-text-${toggleField}"]`).should(
        'exist'
      );
    });

    it('resets all fields in the events viewer when `Reset Fields` is clicked', () => {
      const toggleField = 'host.geo.city_name';

      openEventsViewerFieldsBrowser();

      cy.get(`${EVENTS_VIEWER_PANEL} [data-test-subj="reset-fields"]`).click({ force: true });

      cy.get(`${EVENTS_VIEWER_PANEL} [data-test-subj="header-text-${toggleField}"]`).should(
        'not.exist'
      );
    });

    it('closes the fields browser when the user clicks outside of it', () => {
      clickOutsideFieldsBrowser();

      cy.get(FIELDS_BROWSER_CONTAINER).should('not.exist');
    });

    it('filters the events by applying filter criteria from the search bar at the top of the page', () => {
      const filterInput = '4bf34c1c-eaa9-46de-8921-67a4ccc49829'; // this will never match real data

      cy.get(HEADER_SUBTITLE)
        .invoke('text')
        .then(text1 => {
          cy.get(HEADER_SUBTITLE)
            .invoke('text', { timeout: DEFAULT_TIMEOUT })
            .should('not.equal', 'Showing: 0 events');

          filterSearchBar(filterInput);

          cy.get(HEADER_SUBTITLE)
            .invoke('text')
            .should(text2 => {
              expect(text1).not.to.eq(text2);
            });
        });
    });

    it('loads more events when the load more button is clicked', () => {
      cy.get(LOCAL_EVENTS_COUNT, { timeout: DEFAULT_TIMEOUT })
        .invoke('text')
        .then(text1 => {
          cy.get(LOCAL_EVENTS_COUNT)
            .invoke('text')
            .should('equal', '25');

          cy.get(LOAD_MORE).click({ force: true });

          cy.get(LOCAL_EVENTS_COUNT)
            .invoke('text')
            .should(text2 => {
              expect(text1).not.to.eq(text2);
            });
        });
    });
  });
});
