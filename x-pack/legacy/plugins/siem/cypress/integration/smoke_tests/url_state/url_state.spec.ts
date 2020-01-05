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
  HOST_DETAIL_SIEM_KIBANA,
  BREADCRUMBS,
} from '../../lib/url_state';
import {
  DEFAULT_TIMEOUT,
  loginAndWaitForPage,
  loginAndWaitForPageUrlState,
} from '../../lib/util/helpers';
import {
  assertAtLeastOneEventMatchesSearch,
  executeKQL,
  hostExistsQuery,
  toggleTimelineVisibility,
} from '../../lib/timeline/helpers';
import { NAVIGATION_NETWORK, NAVIGATION_HOSTS } from '../../lib/navigation/selectors';
import { HOSTS_PAGE } from '../../lib/urls';
import { waitForAllHostsWidget } from '../../lib/hosts/helpers';
import { NAVIGATION_HOSTS_ALL_HOSTS, NAVIGATION_HOSTS_ANOMALIES } from '../../lib/hosts/selectors';

describe('url state', () => {
  afterEach(() => {
    return logout();
  });

  it('sets the global start and end dates from the url', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.url);
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
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.url);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON, { timeout: DEFAULT_TIMEOUT })
      .click({ force: true })
      .invoke('text')
      .should('not.equal', 'Updating');

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, { timeout: DEFAULT_TIMEOUT }).type(
      `{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}`
    );

    cy.get(DATE_PICKER_APPLY_BUTTON, { timeout: DEFAULT_TIMEOUT })
      .click({ force: true })
      .invoke('text')
      .should('not.equal', 'Updating');

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${new Date(
        ABSOLUTE_DATE_RANGE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE_RANGE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.url);
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
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlUnlinked);
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
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlUnlinked);

    toggleTimelineVisibility();
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE, { timeout: DEFAULT_TIMEOUT }).click({
      force: true,
    });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, {
      timeout: DEFAULT_TIMEOUT,
    }).type(`{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newStartTimeTyped}`);

    cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click({ force: true });

    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_TAB)
      .first()
      .click({ force: true });

    cy.get(DATE_PICKER_ABSOLUTE_INPUT, {
      timeout: DEFAULT_TIMEOUT,
    }).type(`{selectall}{backspace}${ABSOLUTE_DATE_RANGE.newEndTimeTyped}{enter}`);

    cy.get(DATE_PICKER_APPLY_BUTTON_TIMELINE).click({ force: true });

    cy.url().should(
      'include',
      `timeline:(linkTo:!(),timerange:(from:${new Date(
        ABSOLUTE_DATE_RANGE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE_RANGE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets kql on network page', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets kql on hosts page', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets the url state when kql is set', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.url);
    cy.get(KQL_INPUT, { timeout: 5000 }).type('source.ip: "10.142.0.9" {enter}');
    cy.url().should('include', `query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')`);
  });

  it('sets the url state when kql is set and check if href reflect this change', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.url);
    cy.get(KQL_INPUT, { timeout: 5000 }).type('source.ip: "10.142.0.9" {enter}');
    cy.get(NAVIGATION_HOSTS)
      .first()
      .click({ force: true });
    cy.get(NAVIGATION_NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1576766068062,kind:absolute,to:1576938877264)),timeline:(linkTo:!(global),timerange:(from:1576766068062,kind:absolute,to:1576938877264)))"
    );
  });

  it.skip('sets KQL in host page and detail page and check if href match on breadcrumb, tabs and subTabs', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlHost);
    cy.get(KQL_INPUT, { timeout: 5000 }).type('host.name: "siem-kibana" {enter}');
    cy.get(NAVIGATION_HOSTS_ALL_HOSTS, { timeout: 5000 })
      .first()
      .click({ force: true });
    waitForAllHostsWidget();
    cy.get(NAVIGATION_HOSTS).should(
      'have.attr',
      'href',
      "#/link-to/hosts?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1576766068062,kind:absolute,to:1576938877264)),timeline:(linkTo:!(global),timerange:(from:1576766068062,kind:absolute,to:1576938877264)))"
    );
    cy.get(NAVIGATION_NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1576766068062,kind:absolute,to:1576938877264)),timeline:(linkTo:!(global),timerange:(from:1576766068062,kind:absolute,to:1576938877264)))"
    );
    cy.get(HOST_DETAIL_SIEM_KIBANA, { timeout: 5000 })
      .first()
      .invoke('text')
      .should('eq', 'siem-kibana');
    cy.get(HOST_DETAIL_SIEM_KIBANA)
      .first()
      .click({ force: true });
    cy.get(KQL_INPUT, { timeout: 5000 }).clear();
    cy.get(KQL_INPUT, { timeout: 5000 }).type('agent.type: "auditbeat" {enter}');
    cy.get(NAVIGATION_HOSTS_ANOMALIES).should(
      'have.attr',
      'href',
      "#/hosts/siem-kibana/anomalies?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))"
    );
    cy.get(BREADCRUMBS)
      .eq(1)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))"
      );
    cy.get(BREADCRUMBS)
      .eq(2)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts/siem-kibana?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))"
      );
  });

  it('Do not clears kql when navigating to a new page', () => {
    loginAndWaitForPageUrlState(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(NAVIGATION_NETWORK).click({ force: true });
    cy.get(KQL_INPUT, { timeout: 5000 }).should('have.attr', 'value', 'source.ip: "10.142.0.9"');
  });

  it('sets and reads the url state for timeline by id', () => {
    loginAndWaitForPage(HOSTS_PAGE);
    toggleTimelineVisibility();
    executeKQL(hostExistsQuery);
    assertAtLeastOneEventMatchesSearch();
    const bestTimelineName = 'The Best Timeline';
    cy.get(TIMELINE_TITLE).type(`${bestTimelineName}{enter}`);
    cy.url({ timeout: DEFAULT_TIMEOUT }).should('include', 'timeline=(id');
    cy.hash().then(hash => {
      const matched = hash.match(/timeline=\(id:'(.+)'/g);
      const newTimelineId = matched && matched.length > 0 ? matched[0] : 'null';
      expect(matched).to.have.lengthOf(1);
      cy.log('hash', hash);
      cy.log('matched', matched);
      cy.log('newTimelineId', newTimelineId);
      cy.visit(
        `${
          Cypress.config().baseUrl
        }/app/siem#/overview?timeline=(id:'${newTimelineId}',isOpen:!t)&timerange=(global:(linkTo:!(),timerange:(from:1578171649836,fromStr:now-24h,kind:relative,to:1578258049837,toStr:now)),timeline:(linkTo:!(),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))`
      ).then(() => cy.get(TIMELINE_TITLE).should('have.attr', 'value', bestTimelineName));
    });
  });
});
