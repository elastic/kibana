/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSafeInternalHref } from './internal_link';

const noBase = { requestBasePath: '', serverBasePath: '' };
const onlyServer = { requestBasePath: '/kbn', serverBasePath: '/kbn' };
const inSpace = { requestBasePath: '/kbn/s/my-space', serverBasePath: '/kbn' };
const SCRIPT_SCHEME = ['java', 'script'].join('');

describe('toSafeInternalHref', () => {
  it.each([
    ['/app/dashboards#/view/abc', '/app/dashboards#/view/abc'],
    ['/app/discover?foo=bar#/x', '/app/discover?foo=bar#/x'],
    ['/app/discover/', '/app/discover/'],
  ])('accepts %s', (href, expected) => {
    expect(toSafeInternalHref(href, noBase)).toBe(expected);
  });

  it('does not produce a double-space prefix', () => {
    const requestBasePath = '/s/my-space';
    expect(
      toSafeInternalHref('/s/my-space/app/dashboards', {
        requestBasePath,
        serverBasePath: '',
      })
    ).toBe(`${requestBasePath}/app/dashboards`);
  });

  it('adds the space prefix once to a link without one', () => {
    expect(toSafeInternalHref('/app/dashboards', inSpace)).toBe('/kbn/s/my-space/app/dashboards');
  });

  it('does not use the default space prefix', () => {
    expect(toSafeInternalHref('/s/default/app/dashboards', inSpace)).toBe('/kbn/app/dashboards');
  });

  it('keeps the space of a cross-space link', () => {
    expect(toSafeInternalHref('/s/other/app/dashboards#/view/a', inSpace)).toBe(
      '/kbn/s/other/app/dashboards#/view/a'
    );
  });

  it('adds the space of a cross-space link when the current base path has none', () => {
    expect(toSafeInternalHref('/s/other/app/discover', onlyServer)).toBe(
      '/kbn/s/other/app/discover'
    );
  });

  it.each(['/s/Bad%20Id/app/dashboards', '/s/a.b/app/dashboards', '/s//app/dashboards', '/s/x'])(
    'rejects a malformed space prefix: %s',
    (href) => {
      expect(toSafeInternalHref(href, inSpace)).toBeUndefined();
    }
  );

  it.each(['/app/dev_tools#/console?load_from=data:text/plain,abc', '/app/lens', '/s/x/app/maps'])(
    'rejects an app that is not allowed: %s',
    (href) => {
      expect(toSafeInternalHref(href, noBase)).toBeUndefined();
    }
  );

  it('prepends the base path', () => {
    expect(toSafeInternalHref('/app/dashboards', onlyServer)).toBe('/kbn/app/dashboards');
  });

  it.each([
    `${SCRIPT_SCHEME}:alert(1)`,
    `${SCRIPT_SCHEME.toUpperCase()}:alert(1)`,
    '&#106;avascript:alert(1)',
    'data:text/html,<p>x</p>',
    'https://evil.com/app/x',
    '//evil.com/app/x',
    '///evil.com/app/x',
    '/\\evil.com/app/x',
    '/\t/evil.com/app/x',
    '/\n/evil.com/app/x',
    'app/dashboards',
    '/app/%2e%2e/api/status',
    '/app/../api/status',
    '/app/x/../../api/status',
    '/api/status',
    '/internal/foo',
    '/logout',
    '/login?next=/app/x',
    '/app',
    '/app/',
    '/s/my-space/api/x',
    ' /app/dashboards',
    '',
  ])('rejects %j', (href) => {
    expect(toSafeInternalHref(href, noBase)).toBeUndefined();
  });
});
