/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import {
  ABSOLUTE_DATE_RANGE,
  DATE_PICKER_ABSOLUTE_INPUT,
  DATE_PICKER_ABSOLUTE_TAB,
  DATE_PICKER_APPLY_BUTTON,
  DATE_PICKER_APPLY_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
  KQL_INPUT,
  TIMELINE_TITLE,
} from '../../lib/url_state';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../lib/util/helpers';
import {
  assertAtLeastOneEventMatchesSearch,
  executeKQL,
  hostExistsQuery,
  toggleTimelineVisibility,
} from '../../lib/timeline/helpers';
import { NAVIGATION_NETWORK } from '../../lib/navigation/selectors';
import { HOSTS_PAGE } from '../../lib/urls';

describe('url state', () => {
  afterEach(() => {
    logout();
  });

  it('sets the global start and end dates from the url', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.endTimeFormat
    );
  });

  it('sets the url state when start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 5000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 5000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON).click({ force: true });

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${ABSOLUTE_DATE_RANGE.newStartTime},kind:absolute,to:${ABSOLUTE_DATE_RANGE.newEndTime}))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    toggleTimelineVisibility();
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.endTimeFormat
    );
  });

  it('sets the timeline start and end dates independently of the global start and end dates when times are unlocked', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlUnlinked);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.endTimeFormat
    );

    toggleTimelineVisibility();
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.startTimeTimelineFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE_RANGE.endTimeTimelineFormat
    );
  });

  it('sets the url state when timeline/global date pickers are unlinked and timeline start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlUnlinked);

    toggleTimelineVisibility();
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE, { timeout: DEFAULT_TIMEOUT }).click({
      force: true,
    });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 5000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click({ force: true });

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: 5000 }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}{enter}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click({ force: true });

    cy.url().should(
      'include',
      `timeline:(linkTo:!(),timerange:(from:${ABSOLUTE_DATE_RANGE.newStartTime},kind:absolute,to:${ABSOLUTE_DATE_RANGE.newEndTime}))`
    );
  });

  it('sets kql on network page when queryLocation == network.page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('does not set kql on network page when queryLocation != network.page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlNetworkHosts);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', '');
  });

  it('sets kql on hosts page when queryLocation == hosts.page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('does not set kql on hosts page when queryLocation != hosts.page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlHostsNetwork);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', '');
  });

  it('sets the url state when kql is set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    cy.get(KQL_INPUT, { timeout: 5000 }).type('source.ip: "10.142.0.9" {enter}');
    cy.url().should(
      'include',
      `kqlQuery=(filterQuery:(expression:'source.ip:%20%2210.142.0.9%22%20',kind:kuery),queryLocation:network.page)`
    );
  });

  it('clears kql when navigating to a new page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(NAVIGATION_NETWORK).click({ force: true });
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', '');
  });

  it('sets and reads the url state for timeline by id', () => {
    loginAndWaitForPage(HOSTS_PAGE);
    toggleTimelineVisibility();
    executeKQL(hostExistsQuery);
    assertAtLeastOneEventMatchesSearch();
    const bestTimelineName = 'The Best Timeline';
    cy.get(TIMELINE_TITLE).type(bestTimelineName);
    cy.hash().then(hash => {
      const matched = hash.match(/(?<=timelineId=\').+?(?=\')/g);
      const newTimelineId = matched && matched.length > 0 ? matched[0] : 'null';
      expect(matched).to.have.lengthOf(1);
      cy.log('hash', hash);
      cy.log('matched', matched);
      cy.log('newTimelineId', newTimelineId);
      cy.visit(
        `/app/siem#/timelines?timelineId='${newTimelineId}'&timerange=(global:(linkTo:!(),timerange:(from:1565274377369,kind:absolute,to:1565360777369)),timeline:(linkTo:!(),timerange:(from:1565274377369,kind:absolute,to:1565360777369)))`
      ).then(() => cy.get(TIMELINE_TITLE).should('have.attr', 'value', bestTimelineName));
    });
  });
});
