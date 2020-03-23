/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

  it('View a signal in timeline', () => {
    cy.pause();
  });
});
