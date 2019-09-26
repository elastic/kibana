/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { replaceKqlQueryLocationForNetworkPage } from './replace_kql_query_location_for_network_page';
// Suppress warnings about invalid RISON as this is what we are testing
/* eslint-disable no-console */
const originalError = console.log;
describe('replace_kql_query_location_for_host_page', () => {
  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalError;
  });
  test('replaces host details and type details for a page', () => {
    const replacement = replaceKqlQueryLocationForNetworkPage(
      '(filterQuery:(expression:\'process.name: "some-name"\',kind:kuery),queryLocation:network.details,type:details)'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name: "some-name"\',kind:kuery),queryLocation:network.page,type:page)'
    );
  });

  test('does not do anything if the RISON is not valid', () => {
    const replacement = replaceKqlQueryLocationForNetworkPage('invalid rison here');
    expect(replacement).toEqual('invalid rison here');
  });
});
