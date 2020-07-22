/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNAL_ID } from '../screens/detections';
import { PROVIDER_BADGE } from '../screens/timeline';

import {
  expandFirstSignal,
  investigateFirstSignalInTimeline,
  waitForSignalsPanelToBeLoaded,
} from '../tasks/detections';
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';
import { loginAndWaitForPage } from '../tasks/login';

import { DETECTIONS } from '../urls/navigation';

describe('Detections timeline', () => {
  beforeEach(() => {
    esArchiverLoad('timeline_signals');
    loginAndWaitForPage(DETECTIONS);
  });

  afterEach(() => {
    esArchiverUnload('timeline_signals');
  });

  it('Investigate signal in default timeline', () => {
    waitForSignalsPanelToBeLoaded();
    expandFirstSignal();
    cy.get(SIGNAL_ID)
      .first()
      .invoke('text')
      .then((eventId) => {
        investigateFirstSignalInTimeline();
        cy.get(PROVIDER_BADGE).invoke('text').should('eql', `_id: "${eventId}"`);
      });
  });
});
