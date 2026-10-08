/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import type { PdfScreenshotOptions, PngScreenshotOptions } from '@kbn/screenshotting-plugin/server';
import { buildRenderPageRequest, withCaptureOrigin } from './build_payload';

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

describe('withCaptureOrigin', () => {
  it('swaps the origin while preserving path, query and hash', () => {
    expect(
      withCaptureOrigin(
        'https://localhost:5601/app/reportingRedirect?forceNow=2026-01-01#/view/abc',
        'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud'
      )
    ).toBe(
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud/app/reportingRedirect?forceNow=2026-01-01#/view/abc'
    );
  });

  it('ignores any path on captureBaseUrl and uses only its origin', () => {
    expect(withCaptureOrigin('https://localhost:5601/app/x', 'https://kb.example.com/base')).toBe(
      'https://kb.example.com/app/x'
    );
  });

  it('returns the url untouched when captureBaseUrl is unset', () => {
    expect(withCaptureOrigin(REDIRECT_URL, undefined)).toBe(REDIRECT_URL);
  });

  it('returns the url untouched when either value is unparseable', () => {
    expect(withCaptureOrigin(REDIRECT_URL, 'not a url')).toBe(REDIRECT_URL);
    expect(withCaptureOrigin('not a url', 'https://kb.example.com')).toBe('not a url');
  });

  it('swaps in an internal serverless origin', () => {
    expect(
      withCaptureOrigin(
        'https://localhost:5601/app/reportingRedirect?forceNow=2026-01-01',
        'https://8b1c4f2e9a7d43c6b05e1f8a2d6c9e34.kb.eu-west-1.aws.internal.qa.elastic.cloud'
      )
    ).toBe(
      'https://8b1c4f2e9a7d43c6b05e1f8a2d6c9e34.kb.eu-west-1.aws.internal.qa.elastic.cloud/app/reportingRedirect?forceNow=2026-01-01'
    );
  });
});

describe('buildRenderPageRequest', () => {
  const security = securityServiceMock.createStart();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rewrites the capture url origin to captureBaseUrl when provided', () => {
    const payload = buildRenderPageRequest(
      pdfOptions(),
      security,
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud'
    );

    expect(payload.url).toBe(
      'https://my-project.kb.eu-west-1.aws.qa.elastic.cloud/app/reportingRedirect?forceNow=2026-01-01'
    );
  });

  it('carries the url and the locator/layout context through onNewDocumentScripts', () => {
    const payload = buildRenderPageRequest(pdfOptions(), security);

    expect(payload.url).toBe(REDIRECT_URL);
    expect(payload.onNewDocumentScripts).toHaveLength(2);
    expect(payload.onNewDocumentScripts![0]).toContain('__KBN_SCREENSHOT_MODE_ENABLED_KEY__');
    expect(payload.onNewDocumentScripts![1]).toContain('__KBN_SCREENSHOT_CONTEXT__');
    expect(payload.onNewDocumentScripts![1]).toContain('DASHBOARD_APP_LOCATOR');
    expect(payload.onNewDocumentScripts![1]).toContain('"layout":"print"');
  });

  it('maps pdf print layout to pdf.mode "print" with no css injected', () => {
    const payload = buildRenderPageRequest(pdfOptions({ layout: { id: 'print' } }), security);

    expect(payload.output?.format).toBe('pdf');
    expect(payload.pdf).toEqual({ mode: 'print', title: 'My dashboard' });
    expect(payload.css).toBeUndefined();
  });

  it('maps pdf preserve_layout to pdf.mode "viewport" with the preserve-layout css injected', () => {
    const payload = buildRenderPageRequest(
      pdfOptions({ layout: { id: 'preserve_layout' } }),
      security
    );

    expect(payload.pdf).toEqual({
      mode: 'viewport',
      title: 'My dashboard',
      contentSelector: '[data-shared-items-container]',
    });
    expect(payload.css).toContain('hide-for-sharing');
  });

  it('always sends preserve_layout css for png, with no banner and no pdf.mode', () => {
    const payload = buildRenderPageRequest(pngOptions(), security);

    expect(payload.output?.format).toBe('png');
    expect(payload.css).toContain('hide-for-sharing');
    expect(payload.pdf).toEqual({ contentSelector: '[data-shared-items-container]' });
  });

  it('throws when called with more than one url', () => {
    expect(() =>
      buildRenderPageRequest(
        pdfOptions({
          urls: [
            [REDIRECT_URL, LOCATOR_CONTEXT],
            [REDIRECT_URL, LOCATOR_CONTEXT],
          ],
        }),
        security
      )
    ).toThrow(/exactly one URL per report, got 2/);
  });

  it('accepts a plain string url with no context', () => {
    const payload = buildRenderPageRequest(pdfOptions({ urls: [REDIRECT_URL] }), security);

    expect(payload.url).toBe(REDIRECT_URL);
    expect(payload.onNewDocumentScripts![1]).toContain('{"layout":"print"}');
  });

  it('passes the browser timezone through', () => {
    const payload = buildRenderPageRequest(
      pdfOptions({ browserTimezone: 'America/New_York' }),
      security
    );

    expect(payload.browser?.timezone).toBe('America/New_York');
  });

  it('flattens custom headers into requestHeaders, dropping undefined values', () => {
    const payload = buildRenderPageRequest(
      pdfOptions({
        headers: { 'x-single': 'a', 'x-multi': ['b', 'c'], 'x-missing': undefined },
      }),
      security
    );

    expect(payload.requestHeaders).toEqual({ 'x-single': 'a', 'x-multi': 'b, c' });
  });

  it('throws when called with no urls', () => {
    expect(() => buildRenderPageRequest(pdfOptions({ urls: [] }), security)).toThrow(
      /exactly one URL per report, got 0/
    );
  });

  describe('pageAuth.headers', () => {
    it('forwards a plain (non-UIAM) Authorization header without minting attestation', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey some-base64-key' },
      });

      const payload = buildRenderPageRequest(pdfOptions({ request }), security);

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

      const payload = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.authorization).toBe('ApiKey essu_some-uiam-key');
      expect(payload.pageAuth?.headers?.['x-kbn-uiam-internal-caller-attestation']).toBe(
        'deadbeef'
      );
      expect(security.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders).toHaveBeenCalledWith(
        expect.objectContaining({ scheme: 'ApiKey', credentials: 'essu_some-uiam-key' })
      );
    });

    it('forwards but does not attest a UIAM credential marked external by Task Manager', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey essu_external-key' },
      });
      markExternalUiamCredential(request);

      const payload = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.authorization).toBe('ApiKey essu_external-key');
      expect(
        security.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders
      ).not.toHaveBeenCalled();
    });

    it('forwards but does not attest a UIAM credential that is an external API key', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey essu_external-key' },
      });
      (security.authc.apiKeys.uiam!.isExternalApiKey as jest.Mock).mockReturnValue(true);

      const payload = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.authorization).toBe('ApiKey essu_external-key');
      expect(
        security.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders
      ).not.toHaveBeenCalled();
    });

    it('forwards a cookie header when present, alongside the credential', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'ApiKey some-base64-key', cookie: 'sid=abc' },
      });

      const payload = buildRenderPageRequest(pdfOptions({ request }), security);

      expect(payload.pageAuth?.headers?.cookie).toBe('sid=abc');
    });

    it('produces empty pageAuth.headers when there is no request at all', () => {
      const payload = buildRenderPageRequest(pdfOptions({ request: undefined }), security);

      expect(payload.pageAuth?.headers).toEqual({});
    });
  });
});
