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
  FIELDS_BROWSER_CHECKBOX,
} from '../../../screens/hosts/fields_browser';
import { HOSTS_PAGE } from '../../lib/urls';
import { loginAndWaitForPage } from '../../../tasks/login';
import { openEventsViewerFieldsBrowser, filterSearchBar } from '../../lib/events_viewer/helpers';
import { closeFieldsBrowser } from '../../../tasks/hosts/fields_browsers';
import { openEvents } from '../../../tasks/hosts/main';
import {
  closeModal,
  opensInspectQueryModal,
  waitsForEventsToBeLoaded,
  addsHostGeoCityNameToHeader,
  addsHostGeoCountryNameToHeader,
  resetFields,
} from '../../../tasks/hosts/events';
import {
  elementShouldExist,
  elementShouldEqualText,
  elementShouldNotExist,
  elementShouldBeChecked,
  elementShouldNotEqualText,
} from '../../../tasks/should';
import {
  HEADER_SUBTITLE,
  INSPECT_MODAL,
  LOAD_MORE,
  LOCAL_EVENTS_COUNT,
  HOST_GEO_CITY_NAME_HEADER,
  HOST_GEO_COUNTRY_NAME_HEADER,
} from '../../../screens/hosts/events';

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
      openEvents();
    });

    beforeEach(() => {
      openEventsViewerFieldsBrowser();
    });

    afterEach(() => {
      closeFieldsBrowser();
      elementShouldNotExist(FIELDS_BROWSER_CONTAINER);
    });

    it('renders the fields browser with the expected title when the Events Viewer Fields Browser button is clicked', () => {
      elementShouldEqualText(FIELDS_BROWSER_TITLE, 'Customize Columns');
    });

    it('displays the `default ECS` category (by default)', () => {
      elementShouldEqualText(FIELDS_BROWSER_SELECTED_CATEGORY_TITLE, 'default ECS');
    });

    it('displays a checked checkbox for all of the default events viewer columns that are also in the default ECS category', () => {
      defaultHeadersInDefaultEcsCategory.forEach(header =>
        elementShouldBeChecked(FIELDS_BROWSER_CHECKBOX(header.id))
      );
    });
  });

  context('Events viewer query modal', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      openEvents();
    });

    after(() => {
      closeModal();
      elementShouldNotExist(INSPECT_MODAL);
    });

    it('launches the inspect query modal when the inspect button is clicked', () => {
      waitsForEventsToBeLoaded();
      opensInspectQueryModal();
      elementShouldExist(INSPECT_MODAL);
    });
  });

  context('Events viewer fields behaviour', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      openEvents();
    });

    beforeEach(() => {
      openEventsViewerFieldsBrowser();
    });

    it('adds a field to the events viewer when the user clicks the checkbox', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      elementShouldNotExist(HOST_GEO_CITY_NAME_HEADER);
      addsHostGeoCityNameToHeader();
      closeFieldsBrowser();
      elementShouldExist(HOST_GEO_CITY_NAME_HEADER);
    });

    it('resets all fields in the events viewer when `Reset Fields` is clicked', () => {
      const filterInput = 'host.geo.c';

      filterFieldsBrowser(filterInput);
      elementShouldNotExist(HOST_GEO_COUNTRY_NAME_HEADER);
      addsHostGeoCountryNameToHeader();
      resetFields();
      elementShouldNotExist(HOST_GEO_COUNTRY_NAME_HEADER);
    });
  });

  context('Events behaviour', () => {
    before(() => {
      loginAndWaitForPage(HOSTS_PAGE);
      openEvents();
    });

    it('filters the events by applying filter criteria from the search bar at the top of the page', () => {
      const filterInput = '4bf34c1c-eaa9-46de-8921-67a4ccc49829'; // this will never match real data
      waitsForEventsToBeLoaded();
      cy.get(HEADER_SUBTITLE)
        .invoke('text')
        .then(initialNumberOfEvents => {
          filterSearchBar(filterInput);
          elementShouldNotEqualText(HEADER_SUBTITLE, initialNumberOfEvents);
        });
    });

    it('loads more events when the load more button is clicked', () => {
      const defaultNumberOfLoadedEvents = '25';
      elementShouldEqualText(LOCAL_EVENTS_COUNT, defaultNumberOfLoadedEvents);

      cy.get(LOAD_MORE).click({ force: true });

      elementShouldNotEqualText(LOCAL_EVENTS_COUNT, defaultNumberOfLoadedEvents);
    });
  });
});
