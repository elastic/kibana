/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omitBlacklistedHeaders } from './index';

test(`omits blacklisted headers`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const blacklistedHeaders = {
    'accept-encoding': '',
    connection: 'upgrade',
    'content-length': '',
    'content-type': '',
    host: '',
    'transfer-encoding': '',
  };

  const filteredHeaders = await omitBlacklistedHeaders({
    job: {
      title: 'cool-job-bro',
      type: 'csv',
      jobParams: {
        savedObjectId: 'abc-123',
        isImmediate: false,
        savedObjectType: 'search',
      },
    },
    decryptedHeaders: {
      ...permittedHeaders,
      ...blacklistedHeaders,
    },
  });

  expect(filteredHeaders).toEqual(permittedHeaders);
});
