/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isKqlForRoute } from './helpers';
import { CONSTANTS } from './constants';

describe('isKqlForRoute', () => {
  test('host page and host page kuery', () => {
    const result = isKqlForRoute('/hosts', CONSTANTS.hostsPage);
    expect(result).toBeTruthy();
  });
  test('host page and host details kuery', () => {
    const result = isKqlForRoute('/hosts', CONSTANTS.hostsDetails);
    expect(result).toBeFalsy();
  });
  test('works when there is a trailing slash', () => {
    const result = isKqlForRoute('/hosts/', CONSTANTS.hostsPage);
    expect(result).toBeTruthy();
  });
  test('host details and host details kuery', () => {
    const result = isKqlForRoute('/hosts/siem-kibana', CONSTANTS.hostsDetails);
    expect(result).toBeTruthy();
  });
  test('host details and host page kuery', () => {
    const result = isKqlForRoute('/hosts/siem-kibana', CONSTANTS.hostsPage);
    expect(result).toBeFalsy();
  });
  test('network page and network page kuery', () => {
    const result = isKqlForRoute('/network', CONSTANTS.networkPage);
    expect(result).toBeTruthy();
  });
  test('network page and network details kuery', () => {
    const result = isKqlForRoute('/network', CONSTANTS.networkDetails);
    expect(result).toBeFalsy();
  });
  test('network details and network details kuery', () => {
    const result = isKqlForRoute('/network/ip/10.100.7.198', CONSTANTS.networkDetails);
    expect(result).toBeTruthy();
  });
  test('network details and network page kuery', () => {
    const result = isKqlForRoute('/network/ip/123.234.34', CONSTANTS.networkPage);
    expect(result).toBeFalsy();
  });
});
