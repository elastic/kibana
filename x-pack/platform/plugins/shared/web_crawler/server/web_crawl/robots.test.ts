/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALLOW_ALL_ROBOTS, parseRobotsTxt } from './robots';

const USER_AGENT = 'Elastic-Crawler';
const ORIGIN = 'https://example.com';

const isAllowed = (robotsTxt: string, path: string, userAgent: string = USER_AGENT): boolean =>
  parseRobotsTxt(robotsTxt, userAgent).isAllowed(`${ORIGIN}${path}`);

const lines = (...content: string[]): string => content.join('\n');

const getCrawlDelayMs = (robotsTxt: string, userAgent: string = USER_AGENT): number | undefined =>
  parseRobotsTxt(robotsTxt, userAgent).crawlDelayMs;

describe('ALLOW_ALL_ROBOTS', () => {
  it('allows every URL, declares no sitemap and asks for no crawl delay', () => {
    expect(ALLOW_ALL_ROBOTS.isAllowed(`${ORIGIN}/anything?at=all`)).toBe(true);
    expect(ALLOW_ALL_ROBOTS.sitemaps).toEqual([]);
    expect(ALLOW_ALL_ROBOTS.crawlDelayMs).toBeUndefined();
  });
});

describe('parseRobotsTxt', () => {
  describe('group selection', () => {
    it('applies the `*` group when no group names the user agent', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'Disallow: /google-only',
        '',
        'User-agent: Elastic-Crawler-Staging',
        'Disallow: /staging-only',
        '',
        'User-agent: *',
        'Disallow: /private'
      );

      expect(isAllowed(robotsTxt, '/private/page')).toBe(false);
      expect(isAllowed(robotsTxt, '/google-only')).toBe(true);
      expect(isAllowed(robotsTxt, '/staging-only')).toBe(true);
    });

    it.each([
      [
        'after',
        ['User-agent: *', 'Disallow: /', '', 'User-agent: elastic-CRAWLER', 'Disallow: /private'],
      ],
      [
        'before',
        ['User-agent: elastic-CRAWLER', 'Disallow: /private', '', 'User-agent: *', 'Disallow: /'],
      ],
    ])(
      'applies only the group naming the user agent when it comes %s the `*` group',
      (_, content) => {
        const robotsTxt = lines(...content);

        expect(isAllowed(robotsTxt, '/public')).toBe(true);
        expect(isAllowed(robotsTxt, '/private')).toBe(false);
        expect(isAllowed(robotsTxt, '/public', 'Other-Bot')).toBe(false);
      }
    );

    it('applies a group to every user agent line that introduces it', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'User-agent: Elastic-Crawler',
        'Disallow: /shared',
        '',
        'User-agent: *',
        'User-agent: Bingbot',
        'Disallow: /'
      );

      expect(isAllowed(robotsTxt, '/shared/page')).toBe(false);
      expect(isAllowed(robotsTxt, '/other')).toBe(true);
      expect(isAllowed(robotsTxt, '/other', 'Googlebot')).toBe(true);
      expect(isAllowed(robotsTxt, '/other', 'Bingbot')).toBe(false);
      expect(isAllowed(robotsTxt, '/other', 'DuckDuckBot')).toBe(false);
    });

    it('merges the groups that name the same user agent and ends a group at the next one', () => {
      const robotsTxt = lines(
        'Disallow: /orphan',
        'User-agent: Elastic-Crawler',
        'Disallow: /first',
        'User-agent: Googlebot',
        'Disallow: /google-only',
        '',
        'User-agent: Elastic-Crawler',
        'Disallow: /second',
        'Allow: /first/public'
      );

      expect(isAllowed(robotsTxt, '/first')).toBe(false);
      expect(isAllowed(robotsTxt, '/second')).toBe(false);
      expect(isAllowed(robotsTxt, '/first/public')).toBe(true);
      expect(isAllowed(robotsTxt, '/google-only')).toBe(true);
      expect(isAllowed(robotsTxt, '/orphan')).toBe(true);
    });
  });

  describe('rule precedence', () => {
    it('allows everything when there are no rules', () => {
      expect(isAllowed('', '/')).toBe(true);
      expect(isAllowed('User-agent: *', '/page')).toBe(true);
    });

    it('treats rules as case-sensitive path prefixes', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /private');

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/page.html')).toBe(false);
      expect(isAllowed(robotsTxt, '/privateer')).toBe(false);
      expect(isAllowed(robotsTxt, '/public/private')).toBe(true);
      expect(isAllowed(robotsTxt, '/Private')).toBe(true);
      expect(isAllowed(lines('User-agent: *', 'Disallow: /'), '/any/page?with=query')).toBe(false);
    });

    it.each([
      ['Allow', ['Disallow: /docs', 'Allow: /docs/public']],
      ['Disallow', ['Allow: /docs/public', 'Disallow: /docs']],
    ])('lets the longest matching rule win when the %s line comes last', (_, rules) => {
      const robotsTxt = lines('User-agent: *', ...rules);

      expect(isAllowed(robotsTxt, '/docs/internal')).toBe(false);
      expect(isAllowed(robotsTxt, '/docs/public/page')).toBe(true);
    });

    it('lets a longer Disallow override a shorter Allow', () => {
      const robotsTxt = lines('User-agent: *', 'Allow: /', 'Disallow: /private/');

      expect(isAllowed(robotsTxt, '/page')).toBe(true);
      expect(isAllowed(robotsTxt, '/private/page')).toBe(false);
    });

    it('lets Allow win a tie, whichever line comes last', () => {
      expect(isAllowed(lines('User-agent: *', 'Disallow: /page', 'Allow: /page'), '/page')).toBe(
        true
      );
      expect(isAllowed(lines('User-agent: *', 'Allow: /page', 'Disallow: /page'), '/page')).toBe(
        true
      );
    });

    it('lets an empty Disallow in the user agent group override a `*` group that disallows everything', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /',
        '',
        'User-agent: Elastic-Crawler',
        'Disallow:   '
      );

      expect(isAllowed(robotsTxt, '/page')).toBe(true);
      expect(isAllowed(robotsTxt, '/page', 'Other-Bot')).toBe(false);
    });
  });

  describe('wildcards and anchors', () => {
    it.each([
      [
        '/guide/en/*/current*',
        [
          '/guide/en/kibana/current',
          '/guide/en/kibana/current/setup.html',
          '/guide/en/a/b/currently',
        ],
        ['/guide/en/kibana/8.19/index.html', '/guide/en/current', '/blog/guide/en/kibana/current'],
      ],
      ['/guide$', ['/guide'], ['/guide/', '/guides', '/guide?page=1', '/en/guide']],
      ['/*?*', ['/search?q=elastic', '/?page=2'], ['/search', '/']],
      ['/*.php$', ['/index.php', '/a/b/c.php'], ['/index.php?id=1', '/index.php5', '/php']],
      ['/a/*/b/*/c', ['/a/x/b/y/c', '/a/x/y/b/z/c/more'], ['/a/x/b/y', '/a/x/c/y/b', '/a/b/c']],
      ['/fish*fish$', ['/fishfish', '/fish-and-fish'], ['/fish', '/fishfishes']],
      ['*.json', ['/api/data.json'], ['/api/data']],
    ])('matches `%s`', (pattern, disallowed, allowed) => {
      const robotsTxt = lines('User-agent: *', `Disallow: ${pattern}`);

      expect(disallowed.filter((path) => isAllowed(robotsTxt, path))).toEqual([]);
      expect(allowed.filter((path) => !isAllowed(robotsTxt, path))).toEqual([]);
    });

    it('matches query strings and ignores the fragment', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /search?q=',
        'Disallow: /*sessionid=',
        'Allow: /search?q=public',
        'Disallow: /page$'
      );

      expect(isAllowed(robotsTxt, '/search?q=secret')).toBe(false);
      expect(isAllowed(robotsTxt, '/search?q=public')).toBe(true);
      expect(isAllowed(robotsTxt, '/search?page=1')).toBe(true);
      expect(isAllowed(robotsTxt, '/docs/page?a=1&sessionid=abc')).toBe(false);
      expect(isAllowed(robotsTxt, '/page#section')).toBe(false);
    });

    it('uses the pattern length, wildcards included, to pick the most specific rule', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /*.html', 'Allow: /docs/public');

      expect(isAllowed(robotsTxt, '/docs/public.html')).toBe(true);
      expect(isAllowed(robotsTxt, '/docs/other.html')).toBe(false);
    });
  });

  describe('syntax', () => {
    it('ignores comments, blank lines, unknown fields and lines without a separator', () => {
      const robotsTxt = lines(
        '# robots.txt for example.com',
        '',
        'User-agent: * # every crawler',
        '# Disallow: /commented-out',
        'Disallow: /private # keep out',
        '   ',
        'Host: example.com',
        'Disallow /not-a-rule',
        'garbage',
        'Disallow: /also-private'
      );

      expect(isAllowed(robotsTxt, '/commented-out')).toBe(true);
      expect(isAllowed(robotsTxt, '/not-a-rule')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/also-private')).toBe(false);
    });

    it('handles a byte order mark, CRLF line endings, spacing and the case of field names', () => {
      const robotsTxt = [
        '﻿user-AGENT : *',
        '  DISALLOW:/guide$',
        '\taLLoW :   /private/ok  ',
        'Disallow: /private',
        'Crawl-delay: 2',
        'Sitemap: https://example.com/sitemap.xml',
        '',
      ].join('\r\n');

      expect(isAllowed(robotsTxt, '/guide')).toBe(false);
      expect(isAllowed(robotsTxt, '/guide/en')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/ok')).toBe(true);
      expect(parseRobotsTxt(robotsTxt, USER_AGENT)).toEqual(
        expect.objectContaining({
          crawlDelayMs: 2_000,
          sitemaps: ['https://example.com/sitemap.xml'],
        })
      );
    });

    it.each([
      [
        'an HTML error page',
        lines(
          '<!DOCTYPE html>',
          '<head><title>404: Page not found</title>',
          '<link rel="stylesheet" href="https://example.com/style.css"></head>',
          '<body><p>Go back to <a href="https://example.com/">the home page</a>.</p></body>'
        ),
      ],
      [
        'a markdown error page',
        lines(
          'Title: Page not found',
          'URL Source: https://example.com/robots.txt',
          'Warning: Target URL returned error 404: Not Found',
          'Markdown Content:',
          '# 404',
          '* [Docs](https://example.com/docs)'
        ),
      ],
    ])('allows everything and declares no sitemap for %s', (_, content) => {
      const robots = parseRobotsTxt(content, USER_AGENT);

      expect(robots.isAllowed(`${ORIGIN}/docs/page?query=1`)).toBe(true);
      expect(robots.sitemaps).toEqual([]);
      expect(robots.crawlDelayMs).toBeUndefined();
    });
  });

  describe('sitemaps', () => {
    it('collects the Sitemap directives whatever group they appear in, without ending the group', () => {
      const robotsTxt = lines(
        'Sitemap: https://example.com/sitemap-first.xml',
        'User-agent: Googlebot',
        'Disallow: /',
        'Sitemap: https://example.com/sitemap-google.xml',
        '',
        'User-agent: *',
        'sitemap:   /relative-sitemap.xml  ',
        'Sitemap:',
        'Disallow: /private'
      );

      expect(parseRobotsTxt(robotsTxt, USER_AGENT).sitemaps).toEqual([
        'https://example.com/sitemap-first.xml',
        'https://example.com/sitemap-google.xml',
        '/relative-sitemap.xml',
      ]);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });

    it('collects at most 20 sitemaps', () => {
      const robotsTxt = Array.from(
        { length: 50 },
        (_, index) => `Sitemap: https://example.com/sitemap-${index}.xml`
      ).join('\n');

      const { sitemaps } = parseRobotsTxt(robotsTxt, USER_AGENT);

      expect(sitemaps).toHaveLength(20);
      expect(sitemaps[19]).toBe('https://example.com/sitemap-19.xml');
    });
  });

  describe('crawl delay', () => {
    it('returns the Crawl-delay of the `*` group in milliseconds when no group names the user agent', () => {
      const robotsTxt = lines(
        'Crawl-delay: 5',
        'User-agent: Googlebot',
        'Crawl-delay: 7',
        '',
        'User-agent: *',
        'Disallow: /private',
        'Crawl-delay: 2',
        'Allow: /private/press'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(2_000);
      expect(getCrawlDelayMs(robotsTxt, 'Googlebot')).toBe(7_000);
      expect(isAllowed(robotsTxt, '/private/press')).toBe(true);
      expect(
        getCrawlDelayMs(lines('Crawl-delay: 5', 'User-agent: *', 'Disallow:'))
      ).toBeUndefined();
    });

    it('uses only the delay of the group naming the user agent, when there is one', () => {
      const wildcard = ['User-agent: *', 'Crawl-delay: 9', ''];

      expect(
        getCrawlDelayMs(lines(...wildcard, 'User-agent: Elastic-Crawler', 'Crawl-delay: 4'))
      ).toBe(4_000);
      expect(
        getCrawlDelayMs(lines('User-agent: Elastic-Crawler', 'Crawl-delay: 4', '', ...wildcard))
      ).toBe(4_000);
      expect(
        getCrawlDelayMs(lines(...wildcard, 'User-agent: Elastic-Crawler', 'Disallow: /private'))
      ).toBeUndefined();
    });

    it.each([
      ['0.5', 500],
      ['0.001', 1],
      ['  3  ', 3_000],
      ['3 # be gentle', 3_000],
      ['86400', 86_400_000],
    ])('reads a Crawl-delay of "%s" seconds', (value, expectedDelayMs) => {
      expect(getCrawlDelayMs(lines('User-agent: *', `Crawl-delay: ${value}`))).toBe(
        expectedDelayMs
      );
    });

    it.each([
      '0',
      '0.0',
      '-1',
      '',
      'soon',
      '1s',
      '1,5',
      'Infinity',
      '0x10',
      '1e3',
      '.5',
      '5.',
      '+2',
    ])('ignores a Crawl-delay of "%s"', (value) => {
      expect(getCrawlDelayMs(lines('User-agent: *', `Crawl-delay: ${value}`))).toBeUndefined();
    });

    it('uses the last positive delay of a group that declares several', () => {
      expect(
        getCrawlDelayMs(
          lines('User-agent: *', 'Crawl-delay: 2', 'Crawl-delay: 5', 'Crawl-delay: 0')
        )
      ).toBe(5_000);
    });

    it('applies the delay to every user agent line of its group, and ends those lines', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'User-agent: Elastic-Crawler',
        'Crawl-delay: 6',
        'User-agent: *',
        'Disallow: /'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(6_000);
      expect(getCrawlDelayMs(robotsTxt, 'Googlebot')).toBe(6_000);
      expect(getCrawlDelayMs(robotsTxt, 'Bingbot')).toBeUndefined();
      expect(isAllowed(robotsTxt, '/anything')).toBe(true);
      expect(isAllowed(robotsTxt, '/anything', 'Bingbot')).toBe(false);
    });
  });

  describe('pathological input', () => {
    it('stays fast on a very large file with many rules', () => {
      const rules = Array.from({ length: 150_000 }, (_, index) => `Disallow: /path-${index}/*/x$`);
      const robotsTxt = ['User-agent: *', ...rules].join('\n');

      const startedAt = performance.now();
      const robots = parseRobotsTxt(robotsTxt, USER_AGENT);
      const results = Array.from({ length: 200 }, (_, index) =>
        robots.isAllowed(`${ORIGIN}/path-${index}/a/b/c/x?query=${index}`)
      );
      const elapsedMs = performance.now() - startedAt;

      expect(robots.isAllowed(`${ORIGIN}/path-7/anything/x`)).toBe(false);
      expect(results.every((allowed) => allowed)).toBe(true);
      expect(elapsedMs).toBeLessThan(2000);
    });

    it('stays fast on patterns made of many wildcards', () => {
      const robotsTxt = lines(
        'User-agent: *',
        ...Array.from({ length: 200 }, (_, index) => `Disallow: /${'*a'.repeat(1000)}${index}$`)
      );

      const startedAt = performance.now();
      const allowed = parseRobotsTxt(robotsTxt, USER_AGENT).isAllowed(
        `${ORIGIN}/${'a'.repeat(2000)}`
      );
      const elapsedMs = performance.now() - startedAt;

      expect(allowed).toBe(true);
      expect(elapsedMs).toBeLessThan(2000);
    });
  });
});
