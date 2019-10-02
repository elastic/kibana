/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import {
  mlNetworkSingleIpNullFilterQuery,
  mlNetworkSingleIpFilterQuery,
  mlNetworkMultipleIpNullFilterQuery,
  mlNetworkMultipleIpFilterQuery,
  mlNetworkNullFilterQuery,
  mlNetworkFilterQuery,
  mlHostSingleHostNullFilterQuery,
  mlHostSingleHostFilterQueryVariable,
  mlHostSingleHostFilterQuery,
  mlHostMultiHostNullFilterQuery,
  mlHostMultiHostFilterQuery,
  mlHostVariableHostNullFilterQuery,
  mlHostVariableHostFilterQuery,
} from '../../lib/ml_conditional_links';
import { loginAndWaitForPage } from '../../lib/util/helpers';
import { KQL_INPUT } from '../../lib/url_state';

describe('ml conditional links', () => {
  afterEach(() => {
    return logout();
  });

  it('sets the KQL from a single IP with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkSingleIpFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a multiple IPs with a null for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkMultipleIpNullFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2"))'
    );
  });

  it('sets the KQL from a multiple IPs with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkMultipleIpFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2")) and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a $ip$ with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a single host name with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostSingleHostFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a multiple host names with null for filterQuery', () => {
    loginAndWaitForPage(mlHostMultiHostNullFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(host.name: "siem-windows" or host.name: "siem-suricata")'
    );
  });

  it('sets the KQL from a multiple host names with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostMultiHostFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(host.name: "siem-windows" or host.name: "siem-suricata") and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a undefined/null host name but with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostVariableHostFilterQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('redirects from a single IP with a null for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkSingleIpNullFilterQuery);
    cy.url().should(
      'include',
      '/app/siem#/network/ip/127.0.0.1?timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))'
    );
  });

  it('redirects from a single IP with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkSingleIpFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/network/ip/127.0.0.1?kqlQuery=(filterQuery:(expression:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)',kind:kuery),queryLocation:network.details)&timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))"
    );
  });

  it('redirects from a multiple IPs with a null for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkMultipleIpNullFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/network?kqlQuery=(filterQuery:(expression:'((source.ip:%20%22127.0.0.1%22%20or%20destination.ip:%20%22127.0.0.1%22)%20or%20(source.ip:%20%22127.0.0.2%22%20or%20destination.ip:%20%22127.0.0.2%22))'),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))"
    );
  });

  it('redirects from a multiple IPs with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkMultipleIpFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/network?kqlQuery=(filterQuery:(expression:'((source.ip:%20%22127.0.0.1%22%20or%20destination.ip:%20%22127.0.0.1%22)%20or%20(source.ip:%20%22127.0.0.2%22%20or%20destination.ip:%20%22127.0.0.2%22))%20and%20((process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22))',kind:kuery),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))"
    );
  });

  it('redirects from a $ip$ with a null filterQuery', () => {
    loginAndWaitForPage(mlNetworkNullFilterQuery);
    cy.url().should(
      'include',
      '/app/siem#/network?timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))'
    );
  });

  it('redirects from a $ip$ with a value for the filterQuery', () => {
    loginAndWaitForPage(mlNetworkFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/network?kqlQuery=(filterQuery:(expression:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)',kind:kuery),queryLocation:network.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1566990000000,kind:absolute,to:1567000799999)),timeline:(linkTo:!(global),timerange:(from:1566990000000,kind:absolute,to:1567000799999)))"
    );
  });

  it('redirects from a single host name with a null for the filterQuery', () => {
    loginAndWaitForPage(mlHostSingleHostNullFilterQuery);
    cy.url().should(
      'include',
      '/app/siem#/hosts/siem-windows/anomalies?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))'
    );
  });

  it('redirects from a host name with a variable in the filterQuery', () => {
    loginAndWaitForPage(mlHostSingleHostFilterQueryVariable);
    cy.url().should(
      'include',
      '/app/siem#/hosts/siem-windows/anomalies?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))'
    );
  });

  it('redirects from a single host name with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostSingleHostFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/hosts/siem-windows/anomalies?_g=()&kqlQuery=(filterQuery:(expression:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)',kind:kuery),queryLocation:hosts.details)&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))"
    );
  });

  it('redirects from a multiple host names with null for filterQuery', () => {
    loginAndWaitForPage(mlHostMultiHostNullFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/hosts/anomalies?_g=()&kqlQuery=(filterQuery:(expression:'(host.name:%20%22siem-windows%22%20or%20host.name:%20%22siem-suricata%22)'),queryLocation:hosts.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))"
    );
  });

  it('redirects from a multiple host names with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostMultiHostFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/hosts/anomalies?_g=()&kqlQuery=(filterQuery:(expression:'(host.name:%20%22siem-windows%22%20or%20host.name:%20%22siem-suricata%22)%20and%20((process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22))',kind:kuery),queryLocation:hosts.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))"
    );
  });

  it('redirects from a undefined/null host name with a null for the KQL', () => {
    loginAndWaitForPage(mlHostVariableHostNullFilterQuery);
    cy.url().should(
      'include',
      '/app/siem#/hosts/anomalies?_g=()&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))'
    );
  });

  it('redirects from a undefined/null host name but with a value for filterQuery', () => {
    loginAndWaitForPage(mlHostVariableHostFilterQuery);
    cy.url().should(
      'include',
      "/app/siem#/hosts/anomalies?_g=()&kqlQuery=(filterQuery:(expression:'(process.name:%20%22conhost.exe%22%20or%20process.name:%20%22sc.exe%22)',kind:kuery),queryLocation:hosts.page)&timerange=(global:(linkTo:!(timeline),timerange:(from:1559800800000,kind:absolute,to:1559887199999)),timeline:(linkTo:!(global),timerange:(from:1559800800000,kind:absolute,to:1559887199999)))"
    );
  });
});
