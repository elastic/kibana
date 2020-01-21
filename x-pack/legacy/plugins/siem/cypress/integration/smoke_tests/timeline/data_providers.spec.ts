/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_DROPPED_DATA_PROVIDERS,
  TIMELINE_DATA_PROVIDERS_EMPTY,
} from '../../lib/timeline/selectors';
import {
  createNewTimeline,
  dragFromAllHostsToTimeline,
  toggleTimelineVisibility,
} from '../../lib/timeline/helpers';
import { ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS } from '../../lib/hosts/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { waitForAllHostsWidget } from '../../lib/hosts/helpers';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../lib/util/helpers';
import { drag, dragWithoutDrop } from '../../lib/drag_n_drop/helpers';

describe('timeline data providers', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
    waitForAllHostsWidget();
  });

  beforeEach(() => {
    toggleTimelineVisibility();
  });

  afterEach(() => {
    createNewTimeline();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
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

  it('sets the background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the data providers', () => {
    cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
      .first()
      .then(host => drag(host));

    cy.get(TIMELINE_DATA_PROVIDERS).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });

  it('sets the background to euiColorSuccess with a 20% alpha channel when the user starts dragging a host AND is hovering over the data providers', () => {
    cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
      .first()
      .then(host => drag(host));

    cy.get(TIMELINE_DATA_PROVIDERS_EMPTY).then(dataProvidersDropArea =>
      dragWithoutDrop(dataProvidersDropArea)
    );

    cy.get(TIMELINE_DATA_PROVIDERS_EMPTY).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.2) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });

  it('renders the dashed border color as euiColorSuccess when hovering over the data providers', () => {
    cy.get(ALL_HOSTS_WIDGET_DRAGGABLE_HOSTS)
      .first()
      .then(host => drag(host));

    cy.get(TIMELINE_DATA_PROVIDERS_EMPTY).then(dataProvidersDropArea =>
      dragWithoutDrop(dataProvidersDropArea)
    );

    cy.get(TIMELINE_DATA_PROVIDERS).should(
      'have.css',
      'border',
      '3.1875px dashed rgb(1, 125, 115)'
    );
  });
});
