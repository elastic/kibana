/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';
import { waitForSignalsPanelToBeLoaded } from '../tasks/detections';

describe('Detections timeline', () => {
  beforeEach(() => {
    esArchiverLoad('timeline_signals');
    loginAndWaitForPage(DETECTIONS);
  });

  afterEach(() => {
    // esArchiverUnload('timeline_signals');
  });

  it('View a signal in timeline', () => {
    waitForSignalsPanelToBeLoaded();
    cy.get('[data-test-subj="expand-event"]')
      .first()
      .click({ force: true });
    cy.get('[data-test-subj="draggable-content-_id"]')
      .first()
      .invoke('text')
      .then(eventId => {
        cy.get('[data-test-subj="send-signal-to-timeline-button"]')
          .first()
          .click({ force: true });
        cy.get('[data-test-subj="providerBadge"]')
          .invoke('text')
          .should('eql', `_id: "${eventId}"`);
      });
    cy.pause();
  });
});
