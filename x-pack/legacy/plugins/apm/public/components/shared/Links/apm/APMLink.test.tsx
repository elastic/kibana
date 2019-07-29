/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { APMLink } from './APMLink';

test('APMLink should produce the correct URL', async () => {
  const href = await getRenderedHref(
    () => <APMLink path="/some/path" query={{ transactionId: 'blah' }} />,
    {
      search: '?rangeFrom=now-5h&rangeTo=now-2h'
    } as Location
  );

  expect(href).toMatchInlineSnapshot(
    `"#/some/path?rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0&transactionId=blah"`
  );
});

test('APMLink should retain current kuery value if it exists', async () => {
  const href = await getRenderedHref(
    () => <APMLink path="/some/path" query={{ transactionId: 'blah' }} />,
    {
      search: '?kuery=host.hostname~20~3A~20~22fakehostname~22'
    } as Location
  );

  expect(href).toMatchInlineSnapshot(
    `"#/some/path?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0&kuery=host.hostname~20~3A~20~22fakehostname~22&transactionId=blah"`
  );
});

test('APMLink should overwrite current kuery value if new kuery value is provided', async () => {
  const href = await getRenderedHref(
    () => (
      <APMLink
        path="/some/path"
        query={{ kuery: 'host.os~20~3A~20~22linux~22' }}
      />
    ),
    {
      search: '?kuery=host.hostname~20~3A~20~22fakehostname~22'
    } as Location
  );

  expect(href).toMatchInlineSnapshot(
    `"#/some/path?rangeFrom=now-24h&rangeTo=now&refreshPaused=true&refreshInterval=0&kuery=host.os~20~3A~20~22linux~22"`
  );
});
