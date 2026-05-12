/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { anonymizeText } from './executor';
import { HOST_NAME_PATTERN } from '../../../anonymization/default_rules';

describe('anonymizeText', () => {
  const ipRule = { pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', entityClass: 'IP' };
  const emailRule = {
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    entityClass: 'EMAIL',
  };
  const salt = 'test-session-salt';

  it('replaces a matching IP address with a deterministic token', () => {
    const { anonymized, tokenMap } = anonymizeText({
      text: 'Alert from 192.168.1.1 via email admin@example.com',
      rules: [ipRule],
      salt,
    });

    expect(anonymized).not.toContain('192.168.1.1');
    expect(anonymized).toMatch(/IP_[0-9a-f]{32}/);
    const token = [...tokenMap.keys()][0];
    expect(tokenMap.get(token)).toEqual({ original: '192.168.1.1', entityClass: 'IP' });
  });

  it('is idempotent: same value always produces the same token (map idempotency)', () => {
    const { anonymized: a1, tokenMap: m1 } = anonymizeText({
      text: '192.168.1.1 and 192.168.1.1 again',
      rules: [ipRule],
      salt,
    });
    const { anonymized: a2, tokenMap: m2 } = anonymizeText({
      text: '192.168.1.1 and 192.168.1.1 again',
      rules: [ipRule],
      salt,
    });

    expect(a1).toBe(a2);
    expect([...m1.keys()]).toEqual([...m2.keys()]);
  });

  it('produces different tokens for the same value with different salts (cross-session isolation)', () => {
    const { tokenMap: m1 } = anonymizeText({
      text: '192.168.1.1',
      rules: [ipRule],
      salt: 'salt-A',
    });
    const { tokenMap: m2 } = anonymizeText({
      text: '192.168.1.1',
      rules: [ipRule],
      salt: 'salt-B',
    });

    const token1 = [...m1.keys()][0];
    const token2 = [...m2.keys()][0];
    expect(token1).not.toBe(token2);
  });

  it('applies multiple rules independently', () => {
    const { anonymized, tokenMap } = anonymizeText({
      text: 'IP: 10.0.0.1, email: user@test.com',
      rules: [ipRule, emailRule],
      salt,
    });

    expect(anonymized).not.toContain('10.0.0.1');
    expect(anonymized).not.toContain('user@test.com');
    expect(tokenMap.size).toBe(2);
    const classes = [...tokenMap.values()].map((e) => e.entityClass);
    expect(classes).toContain('IP');
    expect(classes).toContain('EMAIL');
  });

  it('returns unchanged text and empty tokenMap when no rule matches', () => {
    const text = 'No PII here at all.';
    const { anonymized, tokenMap } = anonymizeText({ text, rules: [ipRule], salt });

    expect(anonymized).toBe(text);
    expect(tokenMap.size).toBe(0);
  });

  it('skips rules with invalid regex patterns gracefully', () => {
    const badRule = { pattern: '[invalid(', entityClass: 'BAD' };
    expect(() => anonymizeText({ text: '192.168.1.1', rules: [badRule], salt })).not.toThrow();
  });

  describe('HOST_NAME pattern', () => {
    const hostNameRule = { pattern: HOST_NAME_PATTERN, entityClass: 'HOST_NAME' };

    const expectMatch = (text: string, expected: string) => {
      const { anonymized, tokenMap } = anonymizeText({
        text,
        rules: [hostNameRule],
        salt,
      });
      expect(anonymized).not.toContain(expected);
      const originals = [...tokenMap.values()].map((t) => t.original);
      expect(originals).toContain(expected);
    };

    const expectNoMatch = (text: string) => {
      const { anonymized, tokenMap } = anonymizeText({
        text,
        rules: [hostNameRule],
        salt,
      });
      expect(anonymized).toBe(text);
      expect(tokenMap.size).toBe(0);
    };

    it('matches real hostnames (claude.ai)', () => {
      expectMatch('visit claude.ai now', 'claude.ai');
    });

    it('matches multi-label hostnames (host01.corp.example.com)', () => {
      expectMatch('connecting to host01.corp.example.com', 'host01.corp.example.com');
    });

    it('matches intranet TLDs (.internal)', () => {
      expectMatch('srv1.internal is the primary', 'srv1.internal');
    });

    it('matches hyphenated labels', () => {
      expectMatch(
        'route via db-replica-1.us-east-1.aws.com today',
        'db-replica-1.us-east-1.aws.com'
      );
    });

    it('does NOT match common file extensions (package.json, executor.test.ts, kibana.jsonc, tsconfig.json)', () => {
      expectNoMatch('open package.json');
      expectNoMatch('read executor.test.ts');
      expectNoMatch('the kibana.jsonc file');
      expectNoMatch('see tsconfig.json');
    });

    it('does NOT match dotted code identifiers (platform.core.search, index.ts)', () => {
      expectNoMatch('call platform.core.search');
      expectNoMatch('the index.ts file');
    });

    it('does NOT match in-path dotted segments', () => {
      expectNoMatch('/skills/security/alerts/alert-analysis/manifest.md');
      expectNoMatch('/var/log/myapp.io/access.log');
    });

    it('matches a hostname inside a URL', () => {
      // `claude.ai` follows `//` — lookbehind sees `/` and rejects.
      // This documents a known trade-off: hostnames immediately following `//`
      // in URLs are NOT matched. The user-content path-guard is preferred over
      // catching every URL embedding. (RFC custom_patterns is the escape hatch
      // if site-wide URL anonymization is desired.)
      expectNoMatch('visit https://claude.ai/code today');
    });

    it('does NOT match when a label ends in a hyphen (e.g. foo-.com)', () => {
      // RFC-1035 labels cannot end with a hyphen. The leading-character /
      // trailing-character requirement in the regex enforces this.
      // Note: adjacent non-host chars like `--abc.com` still extract `abc.com`
      // (the `--` acts as a word boundary), which is correct behavior — a real
      // hostname embedded in surrounding chars should still be tokenized.
      expectNoMatch('foo-.com');
    });
  });
});
