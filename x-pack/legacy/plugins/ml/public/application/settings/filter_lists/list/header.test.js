/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { FilterListsHeader } from './header';

jest.mock('../../../util/dependency_cache', () => ({
  getDocLinks: () => ({
    ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
    DOC_LINK_VERSION: 'jest-metadata-mock-branch',
  }),
}));

describe('Filter Lists Header', () => {
  const refreshFilterLists = jest.fn(() => {});

  const requiredProps = {
    totalCount: 3,
    refreshFilterLists,
  };

  test('renders header', () => {
    const props = {
      ...requiredProps,
    };

    const component = shallowWithIntl(<FilterListsHeader {...props} />);

    expect(component).toMatchSnapshot();
  });
});
