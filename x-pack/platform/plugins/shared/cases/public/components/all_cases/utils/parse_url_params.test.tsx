/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from '../../../containers/constants';

import { parseUrlParams } from './parse_url_params';

describe('parseUrlParams', () => {
  const defaultValuesAsURL = new URLSearchParams({
    cases: encode({
      ...DEFAULT_FILTER_OPTIONS,
      ...DEFAULT_QUERY_PARAMS,
    }),
  });

  it('parses the default filter options and query params correctly', () => {
    expect(parseUrlParams(defaultValuesAsURL)).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [],
        "category": Array [],
        "customFields": Object {},
        "page": 1,
        "perPage": 10,
        "search": "",
        "severity": Array [],
        "sortField": "createdAt",
        "sortOrder": "desc",
        "status": Array [],
        "tags": Array [],
      }
    `);
  });

  it('parses a mix of fields correctly', () => {
    const state = {
      assignees: ['elastic'],
      tags: ['a', 'b'],
      category: [],
      status: ['open'],
      search: 'My title',
      owner: ['cases'],
      customFields: { my_field: ['foo'] },
    };

    const url = `cases=${encode(state)}`;

    expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
      Object {
        "assignees": Array [
          "elastic",
        ],
        "category": Array [],
        "customFields": Object {
          "my_field": Array [
            "foo",
          ],
        },
        "search": "My title",
        "status": Array [
          "open",
        ],
        "tags": Array [
          "a",
          "b",
        ],
      }
    `);
  });

  it('protects against prototype attacks', () => {
    const firstUrl = 'cases=(customFields:(__proto__:!(foo)))';
    const secondUrl = 'cases=(customFields:(__proto__:(property:payload)))';

    // @ts-expect-error: testing prototype attacks
    expect(parseUrlParams(new URLSearchParams(firstUrl)).__proto__).toEqual({});
    // @ts-expect-error: testing prototype attacks
    expect(parseUrlParams(new URLSearchParams(secondUrl)).__proto__).toEqual({});
  });

  it('parses empty query params correctly', () => {
    expect(parseUrlParams(new URLSearchParams())).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses an empty string correctly', () => {
    expect(parseUrlParams(new URLSearchParams(''))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses an unrecognized query param correctly', () => {
    expect(parseUrlParams(new URLSearchParams('foo='))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses an empty string correctly in the cases object correctly', () => {
    expect(parseUrlParams(new URLSearchParams({ cases: '' }))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses a malformed rison url correctly', () => {
    expect(parseUrlParams(new URLSearchParams({ cases: '!' }))).toMatchInlineSnapshot(`Object {}`);
  });

  it('parses a rison url that is not an object correctly', () => {
    for (const value of ['foo', true, false, ['bar'], null, 0]) {
      expect(parseUrlParams(new URLSearchParams({ cases: encode(value) }))).toEqual({});
    }
  });

  it('validates the query params schema correctly', () => {
    expect(
      parseUrlParams(new URLSearchParams({ cases: encode({ status: 'foo' }) }))
    ).toMatchInlineSnapshot(`Object {}`);
  });

  describe('legacy URLs', () => {
    it('parses a legacy url with all legacy supported keys correctly', () => {
      const url = 'status=open&severity=low&page=2&perPage=50&sortField=closedAt&sortOrder=asc';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "page": 2,
          "perPage": 50,
          "severity": Array [
            "low",
          ],
          "sortField": "closedAt",
          "sortOrder": "asc",
          "status": Array [
            "open",
          ],
        }
      `);
    });

    it('parses a url with status=open,closed', () => {
      const url = 'status=open,closed';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "status": Array [
            "open",
            "closed",
          ],
        }
      `);
    });

    it('parses a url with status=in-progress', () => {
      const url = 'status=in-progress';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "status": Array [
            "in-progress",
          ],
        }
      `);
    });

    it('parses a url with status=open&status=closed', () => {
      const url = 'status=open&status=closed';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "status": Array [
            "open",
            "closed",
          ],
        }
      `);
    });

    it('parses a url with status=open,closed&status=in-progress', () => {
      const url = 'status=open,closed&status=in-progress';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "status": Array [
            "open",
            "closed",
            "in-progress",
          ],
        }
      `);
    });

    it('parses a url with severity=low,medium&severity=high,critical', () => {
      const url = 'severity=low,medium&severity=high,critical';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "severity": Array [
            "low",
            "medium",
            "high",
            "critical",
          ],
        }
      `);
    });

    it('parses a url with severity=low,medium&severity=high&severity=critical', () => {
      const url = 'severity=low,medium&severity=high&severity=critical';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "severity": Array [
            "low",
            "medium",
            "high",
            "critical",
          ],
        }
      `);
    });

    it('parses a url with page=2&page=5&perPage=4&perPage=20', () => {
      const url = 'page=2&page=5&perPage=4&perPage=20';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "page": 2,
          "perPage": 4,
        }
      `);
    });

    it('validates the query params schema correctly', () => {
      const url = 'status=foo';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`Object {}`);
    });

    it('sets the defaults to page and perPage correctly if they are not numbers', () => {
      const url = 'page=foo&perPage=bar';

      expect(parseUrlParams(new URLSearchParams(url))).toMatchInlineSnapshot(`
        Object {
          "page": 1,
          "perPage": 10,
        }
      `);
    });

    it('protects against prototype attacks', () => {
      const url = '__proto__[property]=payload';

      // @ts-expect-error: testing prototype attacks
      expect(parseUrlParams(new URLSearchParams(url)).__proto__.property).toEqual(undefined);
    });
  });
});
