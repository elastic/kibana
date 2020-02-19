/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HOSTS_PAGE } from '../../../urls/navigation';
import {
  waitForAllHostsToBeLoaded,
  dragAndDropFirstHostToTimeline,
  dragFirstHostToTimeline,
  dragFirstHostToEmptyTimelineDataProviders,
} from '../../../tasks/hosts/all_hosts';
import { HOSTS_NAMES_DRAGGABLE } from '../../../screens/hosts/all_hosts';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../../tasks/login';
import { createNewTimeline } from '../../../tasks/timeline/main';
import { openTimeline } from '../../../tasks/siem_main';
import {
  TIMELINE_DATA_PROVIDERS_EMPTY,
  TIMELINE_DATA_PROVIDERS,
  TIMELINE_DROPPED_DATA_PROVIDERS,
} from '../../../screens/timeline/main';

describe('timeline data providers', () => {
  before(() => {
    loginAndWaitForPage(HOSTS_PAGE);
    waitForAllHostsToBeLoaded();
  });

  beforeEach(() => {
    openTimeline();
  });

  afterEach(() => {
    createNewTimeline();
  });

  it('renders the data provider of a host dragged from the All Hosts widget on the hosts page', () => {
    dragAndDropFirstHostToTimeline();

    cy.get(TIMELINE_DROPPED_DATA_PROVIDERS, { timeout: DEFAULT_TIMEOUT })
      .first()
      .invoke('text')
      .then(dataProviderText => {
        cy.get(HOSTS_NAMES_DRAGGABLE)
          .first()
          .invoke('text')
          .should(hostname => {
            expect(dataProviderText).to.eq(`host.name: "${hostname}"`);
          });
      });
  });

  it('sets the background to euiColorSuccess with a 10% alpha channel when the user starts dragging a host, but is not hovering over the data providers', () => {
    dragFirstHostToTimeline();

    cy.get(TIMELINE_DATA_PROVIDERS).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.1) none repeat scroll 0% 0% / auto padding-box border-box'
    );
  });

  it('sets the background to euiColorSuccess with a 20% alpha channel and renders the dashed border color as euiColorSuccess when the user starts dragging a host AND is hovering over the data providers', () => {
    dragFirstHostToEmptyTimelineDataProviders();

    cy.get(TIMELINE_DATA_PROVIDERS_EMPTY).should(
      'have.css',
      'background',
      'rgba(1, 125, 115, 0.2) none repeat scroll 0% 0% / auto padding-box border-box'
    );

    cy.get(TIMELINE_DATA_PROVIDERS).should(
      'have.css',
      'border',
      '3.1875px dashed rgb(1, 125, 115)'
    );
  });
});
