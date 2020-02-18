/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE } from '../../../urls/navigation';
import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../../tasks/login';
import {
  createNewTimeline,
  populateTimeline,
  expandFirstTimelineEventDetails,
  uncheckTimestampToggleField,
  checkIdToggleField,
  dragAndDropIdToggleFieldToTimeline,
} from '../../../tasks/timeline/main';
import { openTimeline } from '../../../tasks/siem_main';
import {
  TIMESTAMP_TOGGLE_FIELD,
  ID_TOGGLE_FIELD,
  TIMESTAMP_HEADER_FIELD,
  ID_HEADER_FIELD,
} from '../../../screens/timeline/main';

describe('toggle column in timeline', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  beforeEach(() => {
    openTimeline();
    populateTimeline();
  });

  afterEach(() => {
    createNewTimeline();
  });

  it('displays a checked Toggle field checkbox for `@timestamp`, a default timeline column', () => {
    expandFirstTimelineEventDetails();
    cy.get(TIMESTAMP_TOGGLE_FIELD).should('be.checked');
  });

  it('displays an Unchecked Toggle field checkbox for `_id`, because it is NOT a default timeline column', () => {
    cy.get(ID_TOGGLE_FIELD).should('not.be.checked');
  });

  it('removes the @timestamp field from the timeline when the user un-checks the toggle', () => {
    expandFirstTimelineEventDetails();
    uncheckTimestampToggleField();

    cy.get(TIMESTAMP_HEADER_FIELD).should('not.exist');
  });

  it('adds the _id field to the timeline when the user checks the field', () => {
    expandFirstTimelineEventDetails();
    checkIdToggleField();

    cy.get(ID_HEADER_FIELD).should('exist');
  });

  it('adds the _id field to the timeline via drag and drop', () => {
    expandFirstTimelineEventDetails();
    dragAndDropIdToggleFieldToTimeline();

    cy.get(ID_HEADER_FIELD, {
      timeout: DEFAULT_TIMEOUT,
    }).should('exist');
  });
});
