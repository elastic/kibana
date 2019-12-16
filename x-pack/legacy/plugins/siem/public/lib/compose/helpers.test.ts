/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errorLink, reTryOneTimeOnErrorLink } from '../../containers/errors';
import { getLinks } from './helpers';
import { HttpLink } from '@apollo/client';

jest.mock('@apollo/client');
jest.mock('../../containers/errors');
const mockHttpLink = { mockHttpLink: 'mockHttpLink' };

// @ts-ignore
HttpLink.mockImplementation(() => mockHttpLink);

describe('getLinks helper', () => {
  test('It should return links in correct order', () => {
    const links = getLinks();
    expect(links[0]).toEqual(errorLink);
    expect(links[1]).toEqual(reTryOneTimeOnErrorLink);
    expect(links[2]).toEqual(mockHttpLink);
  });
});
