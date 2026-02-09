/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { parseUrlParams } from './parse_url_params';
import { TEMPLATES_STATE_URL_KEY } from '../constants';

describe('parseUrlParams', () => {
  it('returns empty object when templates key is not present', () => {
    const urlParams = new URLSearchParams('foo=bar');

    expect(parseUrlParams(urlParams)).toEqual({});
  });

  it('returns empty object for empty URLSearchParams', () => {
    const urlParams = new URLSearchParams();

    expect(parseUrlParams(urlParams)).toEqual({});
  });

  it('parses valid rison-encoded params', () => {
    const state = { page: 2, perPage: 25 };
    const encoded = encode(state);
    const urlParams = new URLSearchParams(`${TEMPLATES_STATE_URL_KEY}=${encoded}`);

    expect(parseUrlParams(urlParams)).toEqual(state);
  });

  it('returns empty object for invalid rison', () => {
    const urlParams = new URLSearchParams(`${TEMPLATES_STATE_URL_KEY}=invalid-rison`);

    expect(parseUrlParams(urlParams)).toEqual({});
  });

  it('returns empty object for non-object rison value', () => {
    const encoded = encode('just-a-string');
    const urlParams = new URLSearchParams(`${TEMPLATES_STATE_URL_KEY}=${encoded}`);

    expect(parseUrlParams(urlParams)).toEqual({});
  });

  it('parses complex state correctly', () => {
    const state = {
      page: 3,
      perPage: 50,
      sortField: 'name',
      sortOrder: 'desc',
      search: 'test',
      tags: ['tag1', 'tag2'],
      author: ['user1'],
    };
    const encoded = encode(state);
    const urlParams = new URLSearchParams(`${TEMPLATES_STATE_URL_KEY}=${encoded}`);

    expect(parseUrlParams(urlParams)).toEqual(state);
  });
});
