/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { drag, drop } from '../../lib/drag_n_drop/helpers';
import { populateTimeline } from '../../lib/fields_browser/helpers';
import { logout } from '../../lib/logout';
import { toggleFirstTimelineEventDetails } from '../../lib/timeline/helpers';
import { HOSTS_PAGE } from '../../lib/urls';
import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../lib/util/helpers';

describe('toggle column in timeline', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  afterEach(() => {
    return logout();
  });

  const timestampField = '@timestamp';
  const idField = '_id';

  it.skip('displays a checked Toggle field checkbox for `@timestamp`, a default timeline column', () => {
    populateTimeline();

    toggleFirstTimelineEventDetails();

    cy.get(`[data-test-subj="toggle-field-${timestampField}"]`).should('be.checked');
  });

  it('displays an Unchecked Toggle field checkbox for `_id`, because it is NOT a default timeline column', () => {
    populateTimeline();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="toggle-field-${idField}"]`).should(
      'not.be.checked'
    );
  });

  it.skip('removes the @timestamp field from the timeline when the user un-checks the toggle', () => {
    populateTimeline();

    toggleFirstTimelineEventDetails();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${timestampField}"]`).should(
      'exist'
    );

    cy.get(
      `[data-test-subj="timeline"] [data-test-subj="toggle-field-${timestampField}"]`
    ).uncheck();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${timestampField}"]`).should(
      'not.exist'
    );
  });

  it.skip('adds the _id field to the timeline when the user checks the field', () => {
    populateTimeline();

    toggleFirstTimelineEventDetails();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${idField}"]`).should(
      'not.exist'
    );

    cy.get(`[data-test-subj="timeline"] [data-test-subj="toggle-field-${idField}"]`).check();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${idField}"]`).should('exist');
  });

  it.skip('adds the _id field to the timeline via drag and drop', () => {
    populateTimeline();

    toggleFirstTimelineEventDetails();

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${idField}"]`).should(
      'not.exist'
    );

    cy.get(`[data-test-subj="timeline"] [data-test-subj="field-name-${idField}"]`).then(field =>
      drag(field)
    );

    cy.get(`[data-test-subj="timeline"] [data-test-subj="headers-group"]`).then(headersDropArea =>
      drop(headersDropArea)
    );

    cy.get(`[data-test-subj="timeline"] [data-test-subj="header-text-${idField}"]`, {
      timeout: DEFAULT_TIMEOUT,
    }).should('exist');
  });
});
