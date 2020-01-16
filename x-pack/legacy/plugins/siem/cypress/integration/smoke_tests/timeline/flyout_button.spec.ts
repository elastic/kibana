/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TIMELINE_FLYOUT_BODY,
  TIMELINE_NOT_READY_TO_DROP_BUTTON,
} from '../../lib/timeline/selectors';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../../lib/hosts/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { waitForAllHostsWidget } from '../../lib/hosts/helpers';
import { loginAndWaitForPage } from '../../lib/util/helpers';
import { drag } from '../../lib/drag_n_drop/helpers';
import { toggleTimelineVisibility } from '../../lib/timeline/helpers';

describe('timeline flyout button', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  it('toggles open the timeline', () => {
    toggleTimelineVisibility();

    cy.get(TIMELINE_FLYOUT_BODY).should('have.css', 'visibility', 'visible');
  });

  it('sets the flyout button background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the flyout button', () => {
    waitForAllHostsWidget();

    cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
      .first()
      .then(host => drag(host));

    cy.get(TIMELINE_NOT_READY_TO_DROP_BUTTON).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });
});
