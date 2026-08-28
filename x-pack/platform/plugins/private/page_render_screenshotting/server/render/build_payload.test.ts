/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { PdfScreenshotOptions, PngScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { buildRenderPageRequest, DEMO_BANNER, withPublicOrigin } from './build_payload';

const REDIRECT_URL = 'http://localhost:5601/app/reportingRedirect?forceNow=2026-01-01';
const LOCATOR_CONTEXT = {
  __REPORTING_REDIRECT_LOCATOR_STORE_KEY__: {
    id: 'DASHBOARD_APP_LOCATOR',
    version: '9.6.0',
    params: { dashboardId: 'abc' },
  },
};

const taskInstanceFields = { retryAt: null, startedAt: null };

function pdfOptions(overrides: Partial<PdfScreenshotOptions> = {}): PdfScreenshotOptions {
  return {
    format: 'pdf',
    title: 'My dashboard',
    browserTimezone: 'UTC',
    layout: { id: 'print' },
    urls: [[REDIRECT_URL, LOCATOR_CONTEXT]],
    taskInstanceFields,
    ...overrides,
  };
}

function pngOptions(overrides: Partial<PngScreenshotOptions> = {}): PngScreenshotOptions {
  return {
    format: 'png',
    browserTimezone: 'UTC',
    urls: [[REDIRECT_URL, LOCATOR_CONTEXT]],
    taskInstanceFields,
    ...overrides,
  };
}

describe('withPublicOrigin', () => {
  it('swaps the origin while preserving path, query and hash', () => {
    expect(
      withPublicOrigin(
        'https://localhost:5601/app/reportingRedirect?forceNow=2026-01-01#/view/abc',
        'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud'
      )
    ).toBe(
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud/app/reportingRedirect?forceNow=2026-01-01#/view/abc'
    );
  });

  it('ignores any path on publicBaseUrl and uses only its origin', () => {
    expect(withPublicOrigin('https://localhost:5601/app/x', 'https://kb.example.com/base')).toBe(
      'https://kb.example.com/app/x'
    );
  });

  it('returns the url untouched when publicBaseUrl is unset', () => {
    expect(withPublicOrigin(REDIRECT_URL, undefined)).toBe(REDIRECT_URL);
  });

  it('returns the url untouched when either value is unparseable', () => {
    expect(withPublicOrigin(REDIRECT_URL, 'not a url')).toBe(REDIRECT_URL);
    expect(withPublicOrigin('not a url', 'https://kb.example.com')).toBe('not a url');
  });
});

describe('buildRenderPageRequest', () => {
  const security = securityServiceMock.createStart();

  it('rewrites the capture url origin to publicBaseUrl when provided', () => {
    const { payload } = buildRenderPageRequest(
      pdfOptions(),
      security,
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud'
    );

    expect(payload.url).toBe(
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud/app/reportingRedirect?forceNow=2026-01-01'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('carries the url and the locator/layout context through onNewDocumentScripts', () => {
    const { payload } = buildRenderPageRequest(pdfOptions(), security);

    expect(payload.url).toBe(REDIRECT_URL);
    expect(payload.onNewDocumentScripts).toHaveLength(2);
    expect(payload.onNewDocumentScripts![0]).toContain('__KBN_SCREENSHOT_MODE_ENABLED_KEY__');
    expect(payload.onNewDocumentScripts![1]).toContain('__KBN_SCREENSHOT_CONTEXT__');
    expect(payload.onNewDocumentScripts![1]).toContain('DASHBOARD_APP_LOCATOR');
    expect(payload.onNewDocumentScripts![1]).toContain('"layout":"print"');
  });

  it('maps pdf print layout to pdf.mode "print" with no css injected', () => {
    const { payload } = buildRenderPageRequest(pdfOptions({ layout: { id: 'print' } }), security);

    expect(payload.output?.format).toBe('pdf');
    expect(payload.pdf).toEqual({ mode: 'print', title: 'My dashboard', banner: DEMO_BANNER });
    expect(payload.css).toBeUndefined();
  });

  it('maps pdf preserve_layout to pdf.mode "viewport" with the preserve-layout css injected', () => {
    const { payload } = buildRenderPageRequest(
      pdfOptions({ layout: { id: 'preserve_layout' } }),
      security
    );

    expect(payload.pdf).toEqual({
      mode: 'viewport',
      title: 'My dashboard',
      banner: DEMO_BANNER,
      contentSelector: '[data-shared-items-container]',
    });
    expect(payload.css).toContain('hide-for-sharing');
  });

  it('always sends preserve_layout css for png, with no banner and no pdf.mode', () => {
    const { payload } = buildRenderPageRequest(pngOptions(), security);

    expect(payload.output?.format).toBe('png');
    expect(payload.css).toContain('hide-for-sharing');
    expect(payload.pdf).toEqual({ contentSelector: '[data-shared-items-container]' });
  });

  it('drops any url past the first and reports the count', () => {
    const { droppedUrlCount } = buildRenderPageRequest(
      pdfOptions({
        urls: [
          [REDIRECT_URL, LOCATOR_CONTEXT],
          [REDIRECT_URL, LOCATOR_CONTEXT],
        ],
      }),
      security
    );

    expect(droppedUrlCount).toBe(1);
  });

  it('throws when called with no urls', () => {
    expect(() => buildRenderPageRequest(pdfOptions({ urls: [] }), security)).toThrow(
      /no URLs to render/
    );
  });

  describe('pageAuth.headers', () => {
    it('forwards a plain (non-UIAM) Authorization header without minting attestation', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey some-base64-key' },
      });

      const { payload } = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.authorization).toBe('ApiKey some-base64-key');
      expect(
        security.authc.apiKeys.uiam?.getInternalCallerAttestationHeaders
      ).not.toHaveBeenCalled();
    });

    it('mints an attestation header for a UIAM (essu_) credential', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey essu_some-uiam-key' },
      });
      (
        security.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders as jest.Mock
      ).mockReturnValue({ 'x-kbn-uiam-internal-caller-attestation': 'deadbeef' });

      const { payload } = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.authorization).toBe('ApiKey essu_some-uiam-key');
      expect(payload.pageAuth?.headers?.['x-kbn-uiam-internal-caller-attestation']).toBe(
        'deadbeef'
      );
      expect(security.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders).toHaveBeenCalledWith(
        expect.objectContaining({ scheme: 'ApiKey', credentials: 'essu_some-uiam-key' })
      );
    });

    it('forwards a cookie header when present, alongside the credential', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey some-base64-key', cookie: 'sid=abc' },
      });

      const { payload } = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.cookie).toBe('sid=abc');
    });

    it('produces empty pageAuth.headers when there is no request at all', () => {
      const { payload } = buildRenderPageRequest(pdfOptions({ request: undefined }), security);

      expect(payload.pageAuth?.headers).toEqual({});
    });
  });
});
