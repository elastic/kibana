/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { replaceKqlQueryLocationForHostPage } from './replace_kql_query_location_for_host_page';

describe('replace_kql_query_location_for_host_page', () => {
  test('replaces host details and type details for a page', () => {
    const replacement = replaceKqlQueryLocationForHostPage(
      '(filterQuery:(expression:\'process.name: "some-name"\',kind:kuery),queryLocation:hosts.details,type:details)'
    );
    expect(replacement).toEqual(
      '(filterQuery:(expression:\'process.name: "some-name"\',kind:kuery),queryLocation:hosts.page,type:page)'
    );
  });

  test('does not do anything if the RISON is not valid', () => {
    const replacement = replaceKqlQueryLocationForHostPage('invalid rison here');
    expect(replacement).toEqual('invalid rison here');
  });
});
