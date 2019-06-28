/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { MLLink } from './MLLink';
import chrome from 'ui/chrome';
import * as savedObjects from '../../../../services/rest/savedObjects';

jest.mock('ui/kfetch');

jest
  .spyOn(chrome, 'addBasePath')
  .mockImplementation(path => `/basepath${path}`);

jest
  .spyOn(savedObjects, 'getAPMIndexPattern')
  .mockReturnValue(
    Promise.resolve({ id: 'apm-index-pattern-id' } as savedObjects.ISavedObject)
  );

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => null);
});

afterAll(() => {
  jest.restoreAllMocks();
});

test('MLLink produces the correct URL', async () => {
  const href = await getRenderedHref(
    () => (
      <MLLink path="/some/path" query={{ ml: { jobIds: ['something'] } }} />
    ),
    {
      search: '?rangeFrom=now-5h&rangeTo=now-2h'
    } as Location
  );

  expect(href).toMatchInlineSnapshot(
    `"/basepath/app/ml#/some/path?_g=(ml:(jobIds:!(something)),refreshInterval:(pause:true,value:'0'),time:(from:now-5h,to:now-2h))"`
  );
});
