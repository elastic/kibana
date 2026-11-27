/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PAGE_SIZE } from '../../../common/constants';
import { parseIndexViewState, serializeIndexViewState } from './index_url_state';

describe('parseIndexViewState', () => {
  it('returns defaults for an empty query string', () => {
    expect(parseIndexViewState('')).toEqual({
      filters: [],
      search: '',
      sort: undefined,
      facets: [],
      columns: [],
      hiddenColumns: [],
      page: 0,
      size: DEFAULT_PAGE_SIZE,
    });
  });

  it('parses Datasette-style filters, facets, sort and pagination', () => {
    expect(
      parseIndexViewState(
        '?host.name=web-1&bytes__gte=100&tag__exists=1&a__b__contains=x&_facet=log.level&_facet=log.level&_sort_desc=@timestamp&_page=3&_size=25&_search=disk'
      )
    ).toEqual({
      filters: [
        { field: 'host.name', operator: 'exact', value: 'web-1' },
        { field: 'bytes', operator: 'gte', value: '100' },
        { field: 'tag', operator: 'exists', value: '' },
        { field: 'a__b', operator: 'contains', value: 'x' },
      ],
      search: 'disk',
      sort: { field: '@timestamp', direction: 'desc' },
      facets: ['log.level'],
      columns: [],
      hiddenColumns: [],
      page: 2,
      size: 25,
    });
  });

  it('treats an unknown operator suffix as part of the field name', () => {
    expect(parseIndexViewState('weird__thing=1').filters).toEqual([
      { field: 'weird__thing', operator: 'exact', value: '1' },
    ]);
  });

  it('clamps invalid and out-of-window pagination', () => {
    expect(parseIndexViewState('_page=-1&_size=abc')).toMatchObject({
      page: 0,
      size: DEFAULT_PAGE_SIZE,
    });
    expect(parseIndexViewState('_page=999999&_size=100')).toMatchObject({ page: 99, size: 100 });
  });
});

describe('serializeIndexViewState', () => {
  it('omits defaults', () => {
    expect(
      serializeIndexViewState({
        filters: [],
        search: '',
        facets: [],
        columns: [],
        hiddenColumns: [],
        page: 0,
        size: DEFAULT_PAGE_SIZE,
      })
    ).toBe('');
  });

  it('round-trips through parseIndexViewState', () => {
    const state = {
      filters: [
        { field: 'host.name', operator: 'exact' as const, value: 'a&b=c' },
        { field: 'bytes', operator: 'lt' as const, value: '5' },
        { field: 'tag', operator: 'missing' as const, value: '' },
      ],
      search: 'x y',
      sort: { field: 'bytes', direction: 'asc' as const },
      facets: ['host.name'],
      columns: ['@timestamp', 'message'],
      hiddenColumns: [],
      page: 1,
      size: 10,
    };
    expect(parseIndexViewState(serializeIndexViewState(state))).toEqual(state);
  });

  it('writes _nocol only when no _col is set', () => {
    const base = { filters: [], search: '', facets: [], page: 0, size: DEFAULT_PAGE_SIZE };
    expect(
      serializeIndexViewState({ ...base, columns: [], hiddenColumns: ['message', 'tags'] })
    ).toBe('_nocol=message&_nocol=tags');
    expect(
      serializeIndexViewState({ ...base, columns: ['message'], hiddenColumns: ['tags'] })
    ).toBe('_col=message');
  });
});
