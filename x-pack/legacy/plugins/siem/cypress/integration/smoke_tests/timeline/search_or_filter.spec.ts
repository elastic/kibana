/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SERVER_SIDE_EVENT_COUNT } from '../../../screens/timeline/main';
import { HOSTS_PAGE } from '../../../urls/navigation';
import { loginAndWaitForPage, DEFAULT_TIMEOUT } from '../../../tasks/login';
import { openTimeline } from '../../../tasks/siem_main';
import { executeTimelineKQL } from '../../../tasks/timeline/main';

describe('timeline search or filter KQL bar', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  it('executes a KQL query', () => {
    const hostExistsQuery = 'host.name: *';
    openTimeline();
    executeTimelineKQL(hostExistsQuery);

    cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
      .invoke('text')
      .should('be.above', 0);
  });
});
