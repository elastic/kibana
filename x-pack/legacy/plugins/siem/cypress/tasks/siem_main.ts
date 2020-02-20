/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MAIN_PAGE, TIMELINE_TOGGLE_BUTTON } from '../screens/siem_main';
import { DEFAULT_TIMEOUT } from '../tasks/login';

export const openTimelineIfClosed = () => {
  cy.get(MAIN_PAGE).then($page => {
    if ($page.find(TIMELINE_TOGGLE_BUTTON).length === 1) {
      openTimeline();
    }
  });
};

export const openTimeline = () => {
  cy.get(TIMELINE_TOGGLE_BUTTON, { timeout: DEFAULT_TIMEOUT }).click();
};
