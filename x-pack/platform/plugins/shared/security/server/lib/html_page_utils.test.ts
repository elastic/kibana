/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n as i18nLib } from '@kbn/i18n';

import { createRedirectHtmlPage } from './html_page_utils';

jest.mock('@kbn/i18n');

describe('createRedirectHtmlPage', () => {
  const mockGetLocale = i18nLib.getLocale as jest.MockedFunction<typeof i18nLib.getLocale>;
  const mockTranslate = i18nLib.translate as jest.MockedFunction<typeof i18nLib.translate>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocale.mockReturnValue('en');
    mockTranslate.mockReturnValue('Click here if you are not redirected automatically');
  });

  it('generates valid HTML with the correct structure', () => {
    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</html>');
  });

  it('includes the heading in the body', () => {
    const heading = 'Redirecting you';
    const html = createRedirectHtmlPage(heading, 'https://example.com');

    expect(html).toContain(`<h1>${heading}</h1>`);
  });

  it('escapes HTML characters in the heading to prevent XSS', () => {
    const maliciousHeading = '<script>alert("XSS")</script>';
    const html = createRedirectHtmlPage(maliciousHeading, 'https://example.com');

    expect(html).not.toContain('<script>alert("XSS")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('includes the location in the meta refresh tag', () => {
    const location = 'https://example.com/path?query=value';
    const html = createRedirectHtmlPage('Test Heading', location);

    expect(html).toContain(`<meta http-equiv="refresh" content="0;url=${location}" />`);
  });

  it('includes the location in the fallback link', () => {
    const location = 'https://example.com/path';
    const html = createRedirectHtmlPage('Test Heading', location);

    expect(html).toContain(`<a href="${location}">`);
  });

  it('includes the translated link text', () => {
    const translatedText = 'Custom translated text';
    mockTranslate.mockReturnValue(translatedText);

    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain(translatedText);
    expect(mockTranslate).toHaveBeenCalledWith('xpack.security.redirectPage.linkText', {
      defaultMessage: 'Click here if you are not redirected automatically',
    });
  });

  it('uses the correct locale from i18n', () => {
    mockGetLocale.mockReturnValue('fr');

    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<html lang="fr">');
    expect(mockGetLocale).toHaveBeenCalled();
  });

  it('includes required meta tags', () => {
    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<meta charSet="utf-8" />');
    expect(html).toContain('<meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />');
    expect(html).toContain('<meta name="viewport" content="width=device-width" />');
    expect(html).toContain('<meta name="theme-color" content="#ffffff" />');
    expect(html).toContain('<meta name="color-scheme" content="light dark" />');
  });

  it('includes favicon links', () => {
    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />');
    expect(html).toContain(
      '<link rel="alternate icon" type="image/png" href="/favicons/favicon.png" />'
    );
  });

  it('includes the title', () => {
    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<title>Elastic</title>');
  });

  it('includes fade-in animation styles', () => {
    const html = createRedirectHtmlPage('Test Heading', 'https://example.com');

    expect(html).toContain('<style type="text/css">');
    expect(html).toContain('body { opacity: 0; animation: fade-in 0.5s ease-in 2s forwards; }');
    expect(html).toContain('@keyframes fade-in { to { opacity: 1; } }');
  });
});
