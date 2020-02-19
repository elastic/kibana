/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE } from '../../../urls/navigation';
import { waitForAllHostsToBeLoaded, dragFirstHostToTimeline } from '../../../tasks/hosts/all_hosts';
import { loginAndWaitForPage } from '../../../tasks/login';
import { openTimelineIfClosed, openTimeline } from '../../../tasks/siem_main';
import {
  TIMELINE_FLYOUT_BODY,
  TIMELINE_NOT_READY_TO_DROP_BUTTON,
} from '../../../screens/timeline/main';
import { createNewTimeline } from '../../../tasks/timeline/main';

describe('timeline flyout button', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
    waitForAllHostsToBeLoaded();
  });

  afterEach(() => {
    openTimelineIfClosed();
    createNewTimeline();
  });

  it('toggles open the timeline', () => {
    openTimeline();
    cy.get(TIMELINE_FLYOUT_BODY).should('have.css', 'visibility', 'visible');
  });

  it('sets the flyout button background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the flyout button', () => {
    dragFirstHostToTimeline();

    cy.get(TIMELINE_NOT_READY_TO_DROP_BUTTON).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });
});
