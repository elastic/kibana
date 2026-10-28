/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '@kbn/core-http-browser';
import { resolveAppHref } from './markdown_link';

/** Stands in for the page's base path: served under `/kbn`, viewed in space `soc`. */
const basePath = {
  serverBasePath: '/kbn',
  prepend: jest.fn((path: string) => `/kbn/s/soc${path}`),
} as unknown as IBasePath;

/** The same page in the default space, with no server base path. */
const bareBasePath = {
  serverBasePath: '',
  prepend: jest.fn((path: string) => path),
} as unknown as IBasePath;

describe('resolveAppHref', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prepends the base path and current space to a link authored without a space', () => {
    expect(resolveAppHref('/app/agent_builder/conversations/c1', basePath)).toBe(
      '/kbn/s/soc/app/agent_builder/conversations/c1'
    );
    expect(basePath.prepend).toHaveBeenCalledWith('/app/agent_builder/conversations/c1');
  });

  it('keeps an explicitly authored space instead of swapping in the current one', () => {
    expect(resolveAppHref('/s/other/app/dashboards#/view/d1', basePath)).toBe(
      '/kbn/s/other/app/dashboards#/view/d1'
    );
    expect(basePath.prepend).not.toHaveBeenCalled();
  });

  it('writes an explicitly authored default space with no prefix, as core does', () => {
    expect(resolveAppHref('/s/default/app/security/rules/id/abc', basePath)).toBe(
      '/kbn/app/security/rules/id/abc'
    );
  });

  it('keeps query and hash on the path', () => {
    expect(resolveAppHref('/s/soc/app/security/alerts?query=a#top', basePath)).toBe(
      '/kbn/s/soc/app/security/alerts?query=a#top'
    );
  });

  it('resolves without a server base path', () => {
    expect(resolveAppHref('/s/other/app/security/alerts', bareBasePath)).toBe(
      '/s/other/app/security/alerts'
    );
    expect(resolveAppHref('/s/default/app/security/alerts', bareBasePath)).toBe(
      '/app/security/alerts'
    );
    expect(resolveAppHref('/app/security/alerts', bareBasePath)).toBe('/app/security/alerts');
  });

  it('leaves a link core already resolved alone instead of doubling the base path', () => {
    expect(resolveAppHref('/kbn/s/soc/app/security/rules/id/abc', basePath)).toBe(
      '/kbn/s/soc/app/security/rules/id/abc'
    );
    expect(resolveAppHref('/kbn', basePath)).toBe('/kbn');
    expect(basePath.prepend).not.toHaveBeenCalled();
  });

  it('still resolves a path that merely starts with the base path text', () => {
    expect(resolveAppHref('/kbnapp/app/security', basePath)).toBe('/kbn/s/soc/kbnapp/app/security');
  });

  it('keeps a query or hash on a space root rather than throwing', () => {
    expect(resolveAppHref('/s/soc?tab=1', basePath)).toBe('/kbn/s/soc/?tab=1');
    expect(resolveAppHref('/s/other#top', basePath)).toBe('/kbn/s/other/#top');
    expect(resolveAppHref('/s/default?tab=1', basePath)).toBe('/kbn/?tab=1');
  });

  it('leaves a link with a mixed-case space id as authored rather than throwing', () => {
    // Core's parser reads this as space `my` with pathname `Space/app/...`.
    expect(resolveAppHref('/s/mySpace/app/security/rules/id/abc', basePath)).toBe(
      '/s/mySpace/app/security/rules/id/abc'
    );
    expect(basePath.prepend).not.toHaveBeenCalled();
  });

  it.each(['https://example.com/runbook', '//example.com/x', 'mailto:soc@example.com'])(
    'leaves %s untouched',
    (href) => {
      expect(resolveAppHref(href, basePath)).toBe(href);
      expect(basePath.prepend).not.toHaveBeenCalled();
    }
  );

  it('renders as authored when the host supplies no base path', () => {
    expect(resolveAppHref('/app/security/rules/id/abc')).toBe('/app/security/rules/id/abc');
  });
});
