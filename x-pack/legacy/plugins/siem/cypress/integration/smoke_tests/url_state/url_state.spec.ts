/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ABSOLUTE_DATE_RANGE } from '../../../urls/state';
import { DEFAULT_TIMEOUT, loginAndWaitForPage } from '../../../tasks/login';
import { HOSTS_PAGE } from '../../../urls/navigation';
import {
  setStartDate,
  setEndDate,
  updateDates,
  setTimelineStartDate,
  setTimelineEndDate,
  updateTimelineDates,
} from '../../../tasks/calendar';
import { waitForIpsTableToBeLoaded } from '../../../tasks/network/flows';
import { openTimeline } from '../../../tasks/siem_main';
import {
  DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE,
  DATE_PICKER_START_DATE_POPOVER_BUTTON,
  DATE_PICKER_END_DATE_POPOVER_BUTTON,
} from '../../../screens/calendar';
import { kqlSearch, navigateFromHeaderTo, clearSearchBar } from '../../../tasks/header';
import { HOSTS, NETWORK, KQL_INPUT, BREADCRUMBS } from '../../../screens/header';
import { openAllHosts } from '../../../tasks/hosts/main';
import { ANOMALIES_TAB } from '../../../screens/hosts/main';
import { waitForAllHostsToBeLoaded, openFirstHostDetails } from '../../../tasks/hosts/all_hosts';
import { HOSTS_NAMES } from '../../../screens/hosts/all_hosts';
import { executeTimelineKQL, addNameToTimeline } from '../../../tasks/timeline/main';
import { SERVER_SIDE_EVENT_COUNT, TIMELINE_TITLE } from '../../../screens/timeline/main';

const ABSOLUTE_DATE = {
  endTime: '1564691609186',
  endTimeFormat: '2019-08-01T20:33:29.186Z',
  endTimeTimeline: '1564779809186',
  endTimeTimelineFormat: '2019-08-02T21:03:29.186Z',
  endTimeTimelineTyped: 'Aug 02, 2019 @ 21:03:29.186',
  endTimeTyped: 'Aug 01, 2019 @ 14:33:29.186',
  newEndTime: '1564693409186',
  newEndTimeFormat: '2019-08-01T21:03:29.186Z',
  newEndTimeTyped: 'Aug 01, 2019 @ 15:03:29.186',
  newStartTime: '1564691609186',
  newStartTimeFormat: '2019-08-01T20:33:29.186Z',
  newStartTimeTyped: 'Aug 01, 2019 @ 14:33:29.186',
  startTime: '1564689809186',
  startTimeFormat: '2019-08-01T20:03:29.186Z',
  startTimeTimeline: '1564776209186',
  startTimeTimelineFormat: '2019-08-02T20:03:29.186Z',
  startTimeTimelineTyped: 'Aug 02, 2019 @ 14:03:29.186',
  startTimeTyped: 'Aug 01, 2019 @ 14:03:29.186',
};

describe('url state', () => {
  it('sets the global start and end dates from the url', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );
  });

  it('sets the url state when start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    setStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateDates();
    waitForIpsTableToBeLoaded();
    setEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateDates();

    cy.url().should(
      'include',
      `(global:(linkTo:!(timeline),timerange:(from:${new Date(
        ABSOLUTE_DATE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets the timeline start and end dates from the url when locked to global time', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    openTimeline();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );
  });

  it('sets the timeline start and end dates independently of the global start and end dates when times are unlocked', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlUnlinked);

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeFormat
    );

    openTimeline();

    cy.get(DATE_PICKER_START_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.startTimeTimelineFormat
    );
    cy.get(DATE_PICKER_END_DATE_POPOVER_BUTTON_TIMELINE).should(
      'have.attr',
      'title',
      ABSOLUTE_DATE.endTimeTimelineFormat
    );
  });

  it('sets the url state when timeline/global date pickers are unlinked and timeline start and end date are set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlUnlinked);
    openTimeline();
    setTimelineStartDate(ABSOLUTE_DATE.newStartTimeTyped);
    updateTimelineDates();
    setTimelineEndDate(ABSOLUTE_DATE.newEndTimeTyped);
    updateTimelineDates();

    cy.url().should(
      'include',
      `timeline:(linkTo:!(),timerange:(from:${new Date(
        ABSOLUTE_DATE.newStartTimeTyped
      ).valueOf()},kind:absolute,to:${new Date(ABSOLUTE_DATE.newEndTimeTyped).valueOf()}))`
    );
  });

  it('sets kql on network page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlNetworkNetwork);
    cy.get(KQL_INPUT, { timeout: DEFAULT_TIMEOUT }).should(
      'have.attr',
      'value',
      'source.ip: "10.142.0.9"'
    );
  });

  it('sets kql on hosts page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    cy.get(KQL_INPUT, { timeout: DEFAULT_TIMEOUT }).should(
      'have.attr',
      'value',
      'source.ip: "10.142.0.9"'
    );
  });

  it('sets the url state when kql is set', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');

    cy.url().should('include', `query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')`);
  });

  it('sets the url state when kql is set and check if href reflect this change', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.url);
    kqlSearch('source.ip: "10.142.0.9" {enter}');
    navigateFromHeaderTo(HOSTS);

    cy.get(NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'source.ip:%20%2210.142.0.9%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))"
    );
  });

  it('sets KQL in host page and detail page and check if href match on breadcrumb, tabs and subTabs', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlHostNew);
    kqlSearch('host.name: "siem-kibana" {enter}');
    openAllHosts();
    waitForAllHostsToBeLoaded();

    cy.get(HOSTS).should(
      'have.attr',
      'href',
      "#/link-to/hosts?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(NETWORK).should(
      'have.attr',
      'href',
      "#/link-to/network?query=(language:kuery,query:'host.name:%20%22siem-kibana%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(HOSTS_NAMES, { timeout: DEFAULT_TIMEOUT })
      .first()
      .invoke('text')
      .should('eq', 'siem-kibana');

    openFirstHostDetails();
    clearSearchBar();
    kqlSearch('agent.type: "auditbeat" {enter}');

    cy.get(ANOMALIES_TAB).should(
      'have.attr',
      'href',
      "#/hosts/siem-kibana/anomalies?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
    );
    cy.get(BREADCRUMBS)
      .eq(1)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
      );
    cy.get(BREADCRUMBS)
      .eq(2)
      .should(
        'have.attr',
        'href',
        "#/link-to/hosts/siem-kibana?query=(language:kuery,query:'agent.type:%20%22auditbeat%22%20')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))"
      );
  });

  it('Do not clears kql when navigating to a new page', () => {
    loginAndWaitForPage(ABSOLUTE_DATE_RANGE.urlKqlHostsHosts);
    navigateFromHeaderTo(NETWORK);

    cy.get(KQL_INPUT, { timeout: DEFAULT_TIMEOUT }).should(
      'have.attr',
      'value',
      'source.ip: "10.142.0.9"'
    );
  });

  it('sets and reads the url state for timeline by id', () => {
    loginAndWaitForPage(HOSTS_PAGE);
    openTimeline();
    executeTimelineKQL('host.name: *');

    cy.get(SERVER_SIDE_EVENT_COUNT, { timeout: DEFAULT_TIMEOUT })
      .invoke('text')
      .should('be.above', 0);

    const bestTimelineName = 'The Best Timeline';
    addNameToTimeline(bestTimelineName);

    cy.url().should('include', 'timeline=');
    cy.visit(
      `/app/siem#/timelines?timerange=(global:(linkTo:!(),timerange:(from:1565274377369,kind:absolute,to:1565360777369)),timeline:(linkTo:!(),timerange:(from:1565274377369,kind:absolute,to:1565360777369)))`
    ).then(() => cy.get(TIMELINE_TITLE).should('have.attr', 'value', bestTimelineName));
  });
});
