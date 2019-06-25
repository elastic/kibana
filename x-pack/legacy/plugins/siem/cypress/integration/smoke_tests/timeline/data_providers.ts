/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { login } from '../../lib/login/helpers';
import { logout } from '../../lib/logout';
import { TIMELINE_DROPPED_DATA_PROVIDERS } from '../../lib/timeline/selectors';
import {
  dragFromAllHostsToTimeline,
  TIMELINE_RENDER_DATA_PROVIDERS_TIMEOUT,
} from '../../lib/timeline/helpers';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../../lib/hosts/selectors';

/* eslint-disable spaced-comment */
/// <reference types="cypress"/>

describe('timeline data providers', () => {
  beforeEach(() => {
    login();

    cy.viewport('macbook-15');
  });

  afterEach(() => {
    logout();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
    dragFromAllHostsToTimeline();

    cy.get(TIMELINE_DROPPED_DATA_PROVIDERS, {
      timeout: TIMELINE_RENDER_DATA_PROVIDERS_TIMEOUT,
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
