/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import { TIMELINE_DROPPED_DATA_PROVIDERS } from '../../lib/timeline/selectors';
import { dragFromAllHostsToTimeline, toggleTimelineVisibility } from '../../lib/timeline/helpers';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../../lib/hosts/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { waitForAllHostsWidget } from '../../lib/hosts/helpers';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../lib/util/helpers';

describe('timeline data providers', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_PAGE);
  });

  afterEach(() => {
    return logout();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
    waitForAllHostsWidget();

    toggleTimelineVisibility();

    dragFromAllHostsToTimeline();

    cy.get(TIMELINE_DROPPED_DATA_PROVIDERS, {
      timeout: DEFAULT_TIMEOUT + 10 * 1000,
    })
      .first()
      .invoke('text')
      .then(dataProviderText => {
        // verify the data provider displays the same `host.name` as the host dragged from the `All Hosts` widget
        cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
          .first()
          .invoke('text')
          .should(hostname => {
            expect(dataProviderText).to.eq(`host.name: "${hostname}"`);
          });
      });
  });
});
