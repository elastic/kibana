/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode } from '@kbn/rison';
import { stringifyUrlParams } from './stringify_url_params';
import { TEMPLATES_STATE_URL_KEY } from '../constants';

describe('stringifyUrlParams', () => {
  it('creates URL params with templates key', () => {
    const result = stringifyUrlParams({ page: 1 });

    expect(result.startsWith(`${TEMPLATES_STATE_URL_KEY}=`)).toBe(true);
  });

  it('encodes params as rison', () => {
    const params = { page: 2, perPage: 25 };
    const result = stringifyUrlParams(params);
    const encoded = result.replace(`${TEMPLATES_STATE_URL_KEY}=`, '');

    expect(decode(encoded)).toEqual(params);
  });

  it('preserves other URL params', () => {
    const result = stringifyUrlParams({ page: 1 }, 'other=value');

    expect(result).toContain('other=value');
    expect(result).toContain(`${TEMPLATES_STATE_URL_KEY}=`);
  });

  it('removes existing templates key from current search', () => {
    const existingSearch = `${TEMPLATES_STATE_URL_KEY}=(page:1)&other=value`;
    const result = stringifyUrlParams({ page: 2 }, existingSearch);

    // Should only have one templates key
    const matches = result.match(new RegExp(TEMPLATES_STATE_URL_KEY, 'g'));
    expect(matches?.length).toBe(1);
  });

  it('handles empty current search', () => {
    const result = stringifyUrlParams({ page: 1 }, '');

    expect(result.startsWith(`${TEMPLATES_STATE_URL_KEY}=`)).toBe(true);
    expect(result).not.toContain('&');
  });

  it('handles complex params', () => {
    const params = {
      page: 3,
      perPage: 50,
      tags: ['tag1', 'tag2'],
      search: 'test',
    };
    const result = stringifyUrlParams(params);
    const encoded = result.replace(`${TEMPLATES_STATE_URL_KEY}=`, '');

    expect(decode(encoded)).toEqual(params);
  });
});
