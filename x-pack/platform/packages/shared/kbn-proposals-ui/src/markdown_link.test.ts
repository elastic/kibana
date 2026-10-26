/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveAppHref } from './markdown_link';
import type { GetUrlForApp } from './types';

// Stands in for core: prepends the server base path and current space, as the real one does.
const getUrlForApp: GetUrlForApp = jest.fn(
  (appId, options) => `/kbn/s/soc/app/${appId}${options?.path ?? ''}`
);

describe('resolveAppHref', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves an authored in-app link through getUrlForApp, dropping the authored space', () => {
    expect(resolveAppHref('/s/default/app/security/rules/id/abc', getUrlForApp)).toBe(
      '/kbn/s/soc/app/security/rules/id/abc'
    );
    expect(getUrlForApp).toHaveBeenCalledWith('security', { path: '/rules/id/abc' });
  });

  it('resolves a link authored without a space prefix', () => {
    expect(resolveAppHref('/app/agent_builder/conversations/c1', getUrlForApp)).toBe(
      '/kbn/s/soc/app/agent_builder/conversations/c1'
    );
  });

  it('keeps query and hash on the path', () => {
    resolveAppHref('/app/security/alerts?query=a#top', getUrlForApp);
    expect(getUrlForApp).toHaveBeenCalledWith('security', { path: '/alerts?query=a#top' });
  });

  it.each([
    'https://example.com/runbook',
    '//example.com/x',
    'mailto:soc@example.com',
    '/kbn/other',
  ])('leaves %s untouched', (href) => {
    expect(resolveAppHref(href, getUrlForApp)).toBe(href);
    expect(getUrlForApp).not.toHaveBeenCalled();
  });

  it('renders as authored when the host supplies no resolver', () => {
    expect(resolveAppHref('/app/security/rules/id/abc')).toBe('/app/security/rules/id/abc');
  });
});
