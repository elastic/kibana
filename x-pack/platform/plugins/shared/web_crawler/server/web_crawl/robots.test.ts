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
  it('allows every URL and declares no sitemap', () => {
    expect(ALLOW_ALL_ROBOTS.isAllowed(`${ORIGIN}/anything?at=all`)).toBe(true);
    expect(ALLOW_ALL_ROBOTS.sitemaps).toEqual([]);
  });

  it('asks for no crawl delay', () => {
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
        'User-agent: *',
        'Disallow: /private'
      );

      expect(isAllowed(robotsTxt, '/private/page')).toBe(false);
      expect(isAllowed(robotsTxt, '/google-only')).toBe(true);
      expect(isAllowed(robotsTxt, '/public')).toBe(true);
    });

    it.each([
      [
        'after',
        ['User-agent: *', 'Disallow: /', '', 'User-agent: Elastic-Crawler', 'Disallow: /private'],
      ],
      [
        'before',
        ['User-agent: Elastic-Crawler', 'Disallow: /private', '', 'User-agent: *', 'Disallow: /'],
      ],
    ])('prefers the group naming the user agent when it comes %s the `*` group', (_, content) => {
      const robotsTxt = lines(...content);

      expect(isAllowed(robotsTxt, '/')).toBe(true);
      expect(isAllowed(robotsTxt, '/public')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });

    it('does not fall back to the `*` rules for paths its own group does not mention', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /wildcard-only',
        '',
        'User-agent: Elastic-Crawler',
        'Disallow: /token-only'
      );

      expect(isAllowed(robotsTxt, '/wildcard-only')).toBe(true);
      expect(isAllowed(robotsTxt, '/token-only')).toBe(false);
    });

    it('matches the user agent case-insensitively', () => {
      const robotsTxt = lines('USER-AGENT: elastic-CRAWLER', 'DISALLOW: /private');

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private', 'ELASTIC-crawler')).toBe(false);
      expect(isAllowed(robotsTxt, '/private', 'Other-Bot')).toBe(true);
    });

    it('does not treat a user agent that only starts with the token as a match', () => {
      const robotsTxt = lines('User-agent: Elastic-Crawler-Staging', 'Disallow: /');

      expect(isAllowed(robotsTxt, '/page')).toBe(true);
    });

    it('applies a group to every user agent line that introduces it', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'User-agent: Elastic-Crawler',
        'User-agent: Bingbot',
        'Disallow: /shared',
        '',
        'User-agent: *',
        'Disallow: /'
      );

      expect(isAllowed(robotsTxt, '/shared/page')).toBe(false);
      expect(isAllowed(robotsTxt, '/other')).toBe(true);
      expect(isAllowed(robotsTxt, '/shared/page', 'Bingbot')).toBe(false);
      expect(isAllowed(robotsTxt, '/other', 'DuckDuckBot')).toBe(false);
    });

    it('applies a group shared by `*` and the user agent', () => {
      const robotsTxt = lines('User-agent: *', 'User-agent: Elastic-Crawler', 'Disallow: /shared');

      expect(isAllowed(robotsTxt, '/shared')).toBe(false);
      expect(isAllowed(robotsTxt, '/shared', 'Other-Bot')).toBe(false);
    });

    it('merges the groups that name the same user agent', () => {
      const robotsTxt = lines(
        'User-agent: Elastic-Crawler',
        'Disallow: /first',
        '',
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
    });

    it('merges the `*` groups', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /first',
        '',
        'User-agent: *',
        'Disallow: /second'
      );

      expect(isAllowed(robotsTxt, '/first')).toBe(false);
      expect(isAllowed(robotsTxt, '/second')).toBe(false);
    });

    it('ends a group at the next user agent line that follows its rules', () => {
      const robotsTxt = lines(
        'User-agent: Elastic-Crawler',
        'Disallow: /mine',
        'User-agent: Googlebot',
        'Disallow: /theirs'
      );

      expect(isAllowed(robotsTxt, '/mine')).toBe(false);
      expect(isAllowed(robotsTxt, '/theirs')).toBe(true);
    });

    it('ignores rules that come before any user agent line', () => {
      const robotsTxt = lines('Disallow: /orphan', 'User-agent: *', 'Disallow: /private');

      expect(isAllowed(robotsTxt, '/orphan')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });
  });

  describe('rule precedence', () => {
    it('allows everything when there are no rules', () => {
      expect(isAllowed('', '/')).toBe(true);
      expect(isAllowed('User-agent: *', '/page')).toBe(true);
    });

    it('treats rules as path prefixes', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /private');

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/page.html')).toBe(false);
      expect(isAllowed(robotsTxt, '/privateer')).toBe(false);
      expect(isAllowed(robotsTxt, '/public/private')).toBe(true);
      expect(isAllowed(robotsTxt, '/Private')).toBe(true);
      expect(isAllowed(robotsTxt, '/')).toBe(true);
    });

    it('disallows the whole site with `Disallow: /`', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /');

      expect(isAllowed(robotsTxt, '/')).toBe(false);
      expect(isAllowed(robotsTxt, '/any/page?with=query')).toBe(false);
    });

    it.each([
      ['Allow', ['Disallow: /docs', 'Allow: /docs/public']],
      ['Disallow', ['Allow: /docs/public', 'Disallow: /docs']],
    ])('lets the longest matching rule win when the %s line comes last', (_, rules) => {
      const robotsTxt = ['User-agent: *', ...rules].join('\n');

      expect(isAllowed(robotsTxt, '/docs')).toBe(false);
      expect(isAllowed(robotsTxt, '/docs/internal')).toBe(false);
      expect(isAllowed(robotsTxt, '/docs/public')).toBe(true);
      expect(isAllowed(robotsTxt, '/docs/public/page')).toBe(true);
    });

    it('lets a longer Disallow override a shorter Allow', () => {
      const robotsTxt = lines('User-agent: *', 'Allow: /', 'Disallow: /private/');

      expect(isAllowed(robotsTxt, '/page')).toBe(true);
      expect(isAllowed(robotsTxt, '/private/page')).toBe(false);
    });

    it.each([
      ['Allow', ['Disallow: /page', 'Allow: /page']],
      ['Disallow', ['Allow: /page', 'Disallow: /page']],
    ])('lets Allow win a tie when the %s line comes last', (_, rules) => {
      expect(isAllowed(lines('User-agent: *', ...rules), '/page')).toBe(true);
    });

    it('ignores an empty Disallow', () => {
      expect(isAllowed(lines('User-agent: *', 'Disallow:'), '/page')).toBe(true);
      expect(isAllowed(lines('User-agent: *', 'Disallow:   ', 'Disallow: /private'), '/page')).toBe(
        true
      );
    });

    it('lets an empty Disallow in the user agent group override a `*` group that disallows everything', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /',
        '',
        'User-agent: Elastic-Crawler',
        'Disallow:'
      );

      expect(isAllowed(robotsTxt, '/page')).toBe(true);
      expect(isAllowed(robotsTxt, '/page', 'Other-Bot')).toBe(false);
    });
  });

  describe('wildcards and anchors', () => {
    it.each([
      ['/guide/en/elasticsearch/reference/current/index.html', false],
      ['/guide/en/kibana/current', false],
      ['/guide/en/kibana/current/setup.html', false],
      ['/guide/en/a/b/c/currently', false],
      ['/guide/en/kibana/8.19/index.html', true],
      ['/guide/en/current', true],
      ['/guide/de/kibana/current', true],
      ['/blog/guide/en/kibana/current', true],
    ])('matches `/guide/en/*/current*` against %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /guide/en/*/current*');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it.each([
      ['/guide', false],
      ['/guide/', true],
      ['/guide/en', true],
      ['/guides', true],
      ['/guide?page=1', true],
      ['/en/guide', true],
    ])('matches `/guide$` against %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /guide$');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it.each([
      ['/search?q=elastic', false],
      ['/?page=2', false],
      ['/docs/page?utm_source=x&utm_medium=y', false],
      ['/search', true],
      ['/', true],
      ['/docs/page', true],
    ])('matches `/*?*` against %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /*?*');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it.each([
      ['/index.php', false],
      ['/a/b/c.php', false],
      ['/index.php?id=1', true],
      ['/index.php5', true],
      ['/php', true],
    ])('matches `/*.php$` against %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /*.php$');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it.each([
      ['/a/x/b/y/c', false],
      ['/a/x/y/b/z/c/more', false],
      ['/a//b//c', false],
      ['/a/x/b/y', true],
      ['/a/x/c/y/b', true],
      ['/a/b/c', true],
    ])('matches `/a/*/b/*/c` against %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /a/*/b/*/c');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it.each([
      ['/fishfish', false],
      ['/fish-and-fish', false],
      ['/fish', true],
      ['/fishfishes', true],
    ])('does not let the parts of `/fish*fish$` overlap when matching %s', (path, expected) => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /fish*fish$');

      expect(isAllowed(robotsTxt, path)).toBe(expected);
    });

    it('matches a pattern that starts with a wildcard', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: *.json');

      expect(isAllowed(robotsTxt, '/api/data.json')).toBe(false);
      expect(isAllowed(robotsTxt, '/api/data')).toBe(true);
    });

    it('matches query strings', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /search?q=',
        'Disallow: /*sessionid=',
        'Allow: /search?q=public'
      );

      expect(isAllowed(robotsTxt, '/search?q=secret')).toBe(false);
      expect(isAllowed(robotsTxt, '/search?q=public')).toBe(true);
      expect(isAllowed(robotsTxt, '/search?page=1')).toBe(true);
      expect(isAllowed(robotsTxt, '/search')).toBe(true);
      expect(isAllowed(robotsTxt, '/docs/page?a=1&sessionid=abc')).toBe(false);
    });

    it('uses the pattern length, wildcards included, to pick the most specific rule', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /*.html', 'Allow: /docs/public');

      expect(isAllowed(robotsTxt, '/docs/public.html')).toBe(true);
      expect(isAllowed(robotsTxt, '/docs/other.html')).toBe(false);
    });

    it('ignores the fragment of the URL', () => {
      const robotsTxt = lines('User-agent: *', 'Disallow: /page$');

      expect(isAllowed(robotsTxt, '/page#section')).toBe(false);
    });
  });

  describe('syntax', () => {
    it('ignores comments and blank lines', () => {
      const robotsTxt = lines(
        '# robots.txt for example.com',
        '',
        'User-agent: * # every crawler',
        '',
        '# Disallow: /commented-out',
        'Disallow: /private # keep out',
        '   ',
        'Disallow: /also-private',
        ''
      );

      expect(isAllowed(robotsTxt, '/commented-out')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private-but-longer')).toBe(false);
      expect(isAllowed(robotsTxt, '/also-private')).toBe(false);
      expect(isAllowed(robotsTxt, '/public')).toBe(true);
    });

    it('handles CRLF line endings', () => {
      const robotsTxt = [
        'User-agent: *',
        'Disallow: /guide$',
        'Disallow: /private',
        '',
        'Sitemap: https://example.com/sitemap.xml',
        '',
      ].join('\r\n');

      expect(isAllowed(robotsTxt, '/guide')).toBe(false);
      expect(isAllowed(robotsTxt, '/guide/en')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(parseRobotsTxt(robotsTxt, USER_AGENT).sitemaps).toEqual([
        'https://example.com/sitemap.xml',
      ]);
    });

    it('handles a byte order mark, indentation and spacing around the separator', () => {
      const robotsTxt = lines(
        '﻿User-agent : *',
        '  Disallow:/private',
        '\tAllow :   /private/ok  '
      );

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/ok')).toBe(true);
    });

    it('matches field names case-insensitively', () => {
      const robotsTxt = lines('user-AGENT: *', 'DISALLOW: /private', 'aLLoW: /private/ok');

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/ok')).toBe(true);
    });

    it('ignores unknown fields without ending the group', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Crawl-delay: 10',
        'Disallow: /private',
        'Host: example.com',
        'Clean-param: ref /articles/',
        'Disallow: /also-private'
      );

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/also-private')).toBe(false);
      expect(isAllowed(robotsTxt, '/public')).toBe(true);
    });

    it('ignores lines without a field separator', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow /not-a-rule',
        'garbage',
        'Disallow: /private'
      );

      expect(isAllowed(robotsTxt, '/not-a-rule')).toBe(true);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });
  });

  describe('sitemaps', () => {
    it('collects the Sitemap directives whatever group they appear in', () => {
      const robotsTxt = lines(
        'Sitemap: https://example.com/sitemap-first.xml',
        'User-agent: Googlebot',
        'Disallow: /',
        'Sitemap: https://example.com/sitemap-google.xml',
        '',
        'User-agent: *',
        'sitemap: https://example.com/sitemap-lowercase.xml',
        'Disallow: /private',
        '',
        'SITEMAP:   /relative-sitemap.xml  '
      );

      const { sitemaps } = parseRobotsTxt(robotsTxt, USER_AGENT);

      expect(sitemaps).toEqual([
        'https://example.com/sitemap-first.xml',
        'https://example.com/sitemap-google.xml',
        'https://example.com/sitemap-lowercase.xml',
        '/relative-sitemap.xml',
      ]);
    });

    it('does not let a Sitemap directive between user agent lines and rules break the group', () => {
      const robotsTxt = lines(
        'User-agent: Elastic-Crawler',
        'Sitemap: https://example.com/sitemap.xml',
        'Disallow: /private'
      );

      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });

    it('returns no sitemap when none is declared', () => {
      expect(parseRobotsTxt(lines('User-agent: *', 'Disallow:'), USER_AGENT).sitemaps).toEqual([]);
      expect(parseRobotsTxt(lines('User-agent: *', 'Sitemap:'), USER_AGENT).sitemaps).toEqual([]);
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
        'User-agent: Googlebot',
        'Crawl-delay: 7',
        '',
        'User-agent: *',
        'Crawl-delay: 2'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(2_000);
    });

    it.each([
      [
        'after',
        ['User-agent: *', 'Crawl-delay: 9', '', 'User-agent: Elastic-Crawler', 'Crawl-delay: 4'],
      ],
      [
        'before',
        ['User-agent: Elastic-Crawler', 'Crawl-delay: 4', '', 'User-agent: *', 'Crawl-delay: 9'],
      ],
    ])(
      'prefers the delay of the group naming the user agent when it comes %s the `*` group',
      (_, content) => {
        expect(getCrawlDelayMs(lines(...content))).toBe(4_000);
      }
    );

    it('does not fall back to the delay of the `*` group when the group naming the user agent has none', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Crawl-delay: 9',
        '',
        'User-agent: Elastic-Crawler',
        'Disallow: /private'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBeUndefined();
    });

    it('ignores the delay of a group for another user agent', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'Crawl-delay: 7',
        '',
        'User-agent: *',
        'Disallow: /private'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBeUndefined();
      expect(getCrawlDelayMs(robotsTxt, 'Googlebot')).toBe(7_000);
    });

    it('returns no delay when none is declared', () => {
      expect(getCrawlDelayMs('')).toBeUndefined();
      expect(getCrawlDelayMs(lines('User-agent: *', 'Disallow: /private'))).toBeUndefined();
    });

    it.each([
      ['0.5', 500],
      ['1.5', 1_500],
      ['0.001', 1],
      ['10', 10_000],
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
      '-0.5',
      '',
      'soon',
      '1s',
      '1,5',
      '1 2',
      'NaN',
      'Infinity',
      '0x10',
      '1e3',
      '.5',
      '5.',
      '+2',
    ])('ignores a Crawl-delay of "%s"', (value) => {
      expect(getCrawlDelayMs(lines('User-agent: *', `Crawl-delay: ${value}`))).toBeUndefined();
    });

    it('keeps the earlier delay of a group when a later one is not a positive number', () => {
      const robotsTxt = lines('User-agent: *', 'Crawl-delay: 2', 'Crawl-delay: 0');

      expect(getCrawlDelayMs(robotsTxt)).toBe(2_000);
    });

    it('uses the last delay of a group that declares several', () => {
      const robotsTxt = lines('User-agent: *', 'Crawl-delay: 2', 'Crawl-delay: 5');

      expect(getCrawlDelayMs(robotsTxt)).toBe(5_000);
    });

    it('matches the field name case-insensitively', () => {
      expect(getCrawlDelayMs(lines('User-agent: *', 'CRAWL-DELAY: 2'))).toBe(2_000);
      expect(getCrawlDelayMs(lines('User-agent: *', 'crawl-delay:2'))).toBe(2_000);
    });

    it('applies the delay to every user agent line that introduces its group', () => {
      const robotsTxt = lines(
        'User-agent: Googlebot',
        'User-agent: Elastic-Crawler',
        'Crawl-delay: 6',
        'Disallow: /private'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(6_000);
      expect(getCrawlDelayMs(robotsTxt, 'Googlebot')).toBe(6_000);
      expect(getCrawlDelayMs(robotsTxt, 'Bingbot')).toBeUndefined();
    });

    it('reads the delay wherever it stands in its group', () => {
      const robotsTxt = lines(
        'User-agent: *',
        'Disallow: /private',
        'Crawl-delay: 2',
        'Allow: /private/press'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(2_000);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
      expect(isAllowed(robotsTxt, '/private/press')).toBe(true);
    });

    it('ends the user agent lines of a group, like a rule does', () => {
      const robotsTxt = lines(
        'User-agent: Elastic-Crawler',
        'Crawl-delay: 2',
        'User-agent: *',
        'Disallow: /'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(2_000);
      expect(isAllowed(robotsTxt, '/anything')).toBe(true);
      expect(isAllowed(robotsTxt, '/anything', 'Bingbot')).toBe(false);
    });

    it('ignores a delay that comes before any user agent line', () => {
      expect(
        getCrawlDelayMs(lines('Crawl-delay: 2', 'User-agent: *', 'Disallow:'))
      ).toBeUndefined();
    });

    it('merges the delay of the groups that name the same user agent', () => {
      const robotsTxt = lines(
        'User-agent: Elastic-Crawler',
        'Disallow: /private',
        '',
        'User-agent: Googlebot',
        'Crawl-delay: 9',
        '',
        'User-agent: Elastic-Crawler',
        'Crawl-delay: 3'
      );

      expect(getCrawlDelayMs(robotsTxt)).toBe(3_000);
      expect(isAllowed(robotsTxt, '/private')).toBe(false);
    });

    it('handles CRLF line endings', () => {
      expect(getCrawlDelayMs('User-agent: *\r\nCrawl-delay: 2\r\nDisallow: /private\r\n')).toBe(
        2_000
      );
    });
  });

  describe('content that is not a robots.txt file', () => {
    it.each([
      [
        'an HTML error page',
        lines(
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head><title>404: Page not found</title>',
          '<link rel="stylesheet" href="https://example.com/style.css"></head>',
          '<body><h1>Page not found</h1>',
          '<p>Go back to <a href="https://example.com/">the home page</a>.</p>',
          '</body></html>'
        ),
      ],
      [
        'a markdown error page',
        lines(
          'Title: Page not found',
          '',
          'URL Source: https://example.com/robots.txt',
          '',
          'Warning: Target URL returned error 404: Not Found',
          '',
          'Markdown Content:',
          '# 404',
          '',
          'The page you are looking for does not exist. [Go home](https://example.com/)',
          '',
          '* [Docs](https://example.com/docs)',
          '* [Blog](https://example.com/blog)'
        ),
      ],
      ['blank content', ' \n\n\t\n'],
    ])('allows everything and declares no sitemap for %s', (_, content) => {
      const robots = parseRobotsTxt(content, USER_AGENT);

      expect(robots.isAllowed(`${ORIGIN}/`)).toBe(true);
      expect(robots.isAllowed(`${ORIGIN}/docs/page?query=1`)).toBe(true);
      expect(robots.sitemaps).toEqual([]);
    });
  });

  describe('pathological input', () => {
    it('stays fast on a very large file with many rules', () => {
      const rules = Array.from({ length: 150_000 }, (_, index) => `Disallow: /path-${index}/*/x$`);
      const robotsTxt = ['User-agent: *', ...rules].join('\n');
      expect(robotsTxt.length).toBeGreaterThan(2_000_000);

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
      const url = `${ORIGIN}/${'a'.repeat(2000)}`;

      const startedAt = performance.now();
      const robots = parseRobotsTxt(robotsTxt, USER_AGENT);
      const allowed = robots.isAllowed(url);
      const elapsedMs = performance.now() - startedAt;

      expect(allowed).toBe(true);
      expect(elapsedMs).toBeLessThan(2000);
    });

    it('stays fast on a single very long line', () => {
      const robotsTxt = `User-agent: *\nDisallow: /${'*'.repeat(1_000_000)}`;

      const startedAt = performance.now();
      const robots = parseRobotsTxt(robotsTxt, USER_AGENT);
      robots.isAllowed(`${ORIGIN}/${'a'.repeat(2000)}`);
      const elapsedMs = performance.now() - startedAt;

      expect(elapsedMs).toBeLessThan(2000);
    });
  });
});
