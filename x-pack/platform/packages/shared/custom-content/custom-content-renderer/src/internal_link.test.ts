/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSafeInternalHref } from './internal_link';

const SCRIPT_SCHEME = ['java', 'script'].join('');

describe('toSafeInternalHref', () => {
  it.each([
    ['/app/dashboards#/view/abc', '/app/dashboards#/view/abc'],
    ['/app/discover?foo=bar#/x', '/app/discover?foo=bar#/x'],
    ['/s/my-space/app/dashboards', '/s/my-space/app/dashboards'],
  ])('accepts %s', (href, expected) => {
    expect(toSafeInternalHref(href, '')).toBe(expected);
  });

  it('prepends the base path', () => {
    expect(toSafeInternalHref('/app/dashboards', '/kbn')).toBe('/kbn/app/dashboards');
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
    expect(toSafeInternalHref(href, '')).toBeUndefined();
  });
});
