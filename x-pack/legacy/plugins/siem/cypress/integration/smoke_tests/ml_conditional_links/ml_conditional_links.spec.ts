/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { logout } from '../../lib/logout';
import {
  mlNetworkSingleIpNullKqlQuery,
  mlNetworkSingleIpKqlQuery,
  mlNetworkMultipleIpNullKqlQuery,
  mlNetworkMultipleIpKqlQuery,
  mlNetworkNullKqlQuery,
  mlNetworkKqlQuery,
  mlHostSingleHostNullKqlQuery,
  mlHostSingleHostKqlQueryVariable,
  mlHostSingleHostKqlQuery,
  mlHostMultiHostNullKqlQuery,
  mlHostMultiHostKqlQuery,
  mlHostVariableHostNullKqlQuery,
  mlHostVariableHostKqlQuery,
} from '../../lib/ml_conditional_links';
import { loginAndWaitForPage } from '../../lib/util/helpers';
import { KQL_INPUT } from '../../lib/url_state';

describe('ml conditional links', () => {
  afterEach(() => {
    return logout();
  });

  it('sets the KQL from a single IP with a value for the query', () => {
    loginAndWaitForPage(mlNetworkSingleIpKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a multiple IPs with a null for the query', () => {
    loginAndWaitForPage(mlNetworkMultipleIpNullKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2"))'
    );
  });

  it('sets the KQL from a multiple IPs with a value for the query', () => {
    loginAndWaitForPage(mlNetworkMultipleIpKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '((source.ip: "127.0.0.1" or destination.ip: "127.0.0.1") or (source.ip: "127.0.0.2" or destination.ip: "127.0.0.2")) and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a $ip$ with a value for the query', () => {
    loginAndWaitForPage(mlNetworkKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a single host name with a value for query', () => {
    loginAndWaitForPage(mlHostSingleHostKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('sets the KQL from a multiple host names with null for query', () => {
    loginAndWaitForPage(mlHostMultiHostNullKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(host.name: "siem-windows" or host.name: "siem-suricata")'
    );
  });

  it('sets the KQL from a multiple host names with a value for query', () => {
    loginAndWaitForPage(mlHostMultiHostKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(host.name: "siem-windows" or host.name: "siem-suricata") and ((process.name: "conhost.exe" or process.name: "sc.exe"))'
    );
  });

  it('sets the KQL from a undefined/null host name but with a value for query', () => {
    loginAndWaitForPage(mlHostVariableHostKqlQuery);
    cy.get(KQL_INPUT, { timeout: 5000 }).should(
      'have.attr',
      'value',
      '(process.name: "conhost.exe" or process.name: "sc.exe")'
    );
  });

  it('redirects from a single IP with a null for the query', () => {
    loginAndWaitForPage(mlNetworkSingleIpNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-network/ip/127.0.0.1?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a single IP with a value for the query', () => {
    loginAndWaitForPage(mlNetworkSingleIpKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-network/ip/127.0.0.1?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a multiple IPs with a null for the query', () => {
    loginAndWaitForPage(mlNetworkMultipleIpNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-network/ip/127.0.0.1,127.0.0.2?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-12T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a multiple IPs with a value for the query', () => {
    loginAndWaitForPage(mlNetworkMultipleIpKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-network/ip/127.0.0.1,127.0.0.2?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a $ip$ with a null query', () => {
    loginAndWaitForPage(mlNetworkNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-network/ip/$ip$?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a $ip$ with a value for the query', () => {
    loginAndWaitForPage(mlNetworkKqlQuery);
    cy.url().should('include', '');
  });

  it('redirects from a single host name with a null for the query', () => {
    loginAndWaitForPage(mlHostSingleHostNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/siem-windows?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a host name with a variable in the query', () => {
    loginAndWaitForPage(mlHostSingleHostKqlQueryVariable);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/siem-windows?query=(language:kuery,query:'process.name%20:%20%22$process.name$%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a single host name with a value for query', () => {
    loginAndWaitForPage(mlHostSingleHostKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/siem-windows?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a multiple host names with null for query', () => {
    loginAndWaitForPage(mlHostMultiHostNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/siem-windows,siem-suricata?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a multiple host names with a value for query', () => {
    loginAndWaitForPage(mlHostMultiHostKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/siem-windows,siem-suricata?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a undefined/null host name with a null for the KQL', () => {
    loginAndWaitForPage(mlHostVariableHostNullKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/$host.name$?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });

  it('redirects from a undefined/null host name but with a value for query', () => {
    loginAndWaitForPage(mlHostVariableHostKqlQuery);
    cy.url().should(
      'include',
      "app/siem#/ml-hosts/$host.name$?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))%3Ftimerange%3D(global:(linkTo:!(timeline),timerange:(from:1576754930819,kind:absolute,to:1576927740792)),timeline:(linkTo:!(global),timerange:(from:1576754930819,kind:absolute,to:1576927740792)))"
    );
  });
});
