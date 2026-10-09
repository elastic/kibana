/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';
import { DEFAULT_BUILTIN_REGEX_RULES } from './default_builtin_regex_rules';

type Engine = 'native' | 're2';

const findAll = (engine: Engine, pattern: string, input: string): string[] => {
  if (engine === 'native') {
    return [...input.matchAll(new RegExp(pattern, 'g'))].map(([match]) => match);
  }
  const matcher = RE2JS.compile(pattern).matcher(input);
  const matches: string[] = [];
  while (matcher.find()) {
    matches.push(input.substring(matcher.start(), matcher.end()));
  }
  return matches;
};

const patternFor = (id: string): string => {
  const rule = DEFAULT_BUILTIN_REGEX_RULES.find((candidate) => candidate.id === id);
  if (!rule) {
    throw new Error(`No built-in rule ${id}`);
  }
  return rule.pattern;
};

const ENGINES: Engine[] = ['native', 're2'];
const BUILT_IN_IDS = DEFAULT_BUILTIN_REGEX_RULES.flatMap(({ id }) => (id ? [id] : []));

/**
 * Each rule is checked on native `RegExp` (what the chat-completion worker runs today) and on
 * RE2 (`re2js`, what the workflow worker runs), so a pattern edit that only works on one engine
 * — or that matches different text on each — fails here instead of leaking data in production.
 */
describe.each(ENGINES)('built-in regex rules on %s', (engine) => {
  const expectSpans = (id: string, input: string, expected: string[]) =>
    expect(findAll(engine, patternFor(id), input)).toEqual(expected);

  describe('builtin-email', () => {
    const id = 'builtin-email';

    it.each([
      'a.mehta@example.com',
      'first+tag@sub.example.co.uk',
      'USER@EXAMPLE.COM',
      "o'brien@example.com",
      'müller@firma.de',
      'jörg@exämple.de',
      'иван@пример.рф',
      'Ελένη@παράδειγμα.gr',
      'user@xn--nxasmq6b.com',
    ])('masks %s whole, with no residue', (email) => {
      expectSpans(id, email, [email]);
    });

    it.each([
      ['mail me at john.doe@corp.example.com.', ['john.doe@corp.example.com']],
      ['(john@x.io)', ['john@x.io']],
      ['<j@x.io>', ['j@x.io']],
      ['foo@bar.com,baz@qux.org', ['foo@bar.com', 'baz@qux.org']],
      ['git@github.com:elastic/kibana.git', ['git@github.com']],
      ['jon@elastic.co?subject=hi', ['jon@elastic.co']],
    ])('finds only the address inside %j', (input, expected) => {
      expectSpans(id, input, expected);
    });

    // Scripts outside Latin/Greek/Cyrillic are a documented limit of the built-in rule.
    it.each(['用户@例子.公司', 'דוד@דוגמה.co.il'])('does not mask %s', (email) => {
      expectSpans(id, email, []);
    });

    it.each(['@handle', 'a@b.c', 'user@localhost', 'no address in this sentence'])(
      'does not match %j',
      (input) => {
        expectSpans(id, input, []);
      }
    );
  });

  describe('builtin-ipv4', () => {
    const id = 'builtin-ipv4';

    it.each(['10.42.7.19', '198.51.100.23', '0.0.0.0', '255.255.255.255', '192.168.001.001'])(
      'masks %s whole',
      (ip) => {
        expectSpans(id, ip, [ip]);
      }
    );

    it.each([
      ['10.0.0.1:9200', ['10.0.0.1']],
      ['10.0.0.1/24', ['10.0.0.1']],
      ['ip=10.0.0.1,', ['10.0.0.1']],
      ['ends a sentence with 10.1.1.1.', ['10.1.1.1']],
      ['host-10.0.0.1', ['10.0.0.1']],
      ['::ffff:192.168.1.1', ['192.168.1.1']],
      // A longer dotted-number run is masked whole instead of leaving `.5` behind.
      ['1.2.3.4.5', ['1.2.3.4.5']],
      // Four-part versions are indistinguishable from addresses; this is a documented limit.
      ['python 3.11.4.2', ['3.11.4.2']],
    ])('finds only the address inside %j', (input, expected) => {
      expectSpans(id, input, expected);
    });

    it.each([
      '256.1.1.1',
      '999.999.999.999',
      '1.2.3',
      '10.0.0.256',
      'v10.0.0.1',
      'a10.0.0.1',
      '10.0.0.1a',
      '2001:db8::1',
    ])('does not match %j', (input) => {
      expectSpans(id, input, []);
    });
  });

  describe('builtin-host-name', () => {
    const id = 'builtin-host-name';

    it.each([
      'web-01.prod.example.com',
      'db-server-2.svc.cluster.local',
      'api.openai.com',
      'es01.prod.elastic.co',
      'github.io',
      'my-service.default.svc.cluster.local',
      'pod-0.my-svc.default.svc.cluster.local',
      'internal-db.corp.acme.co.uk',
      'ip-10-0-0-1.ec2.internal',
      'ec2-1-2-3-4.compute-1.amazonaws.com',
      'srv.example.xyz',
      'srv.example.es',
      'srv.example.in',
      'a.b.c.d.e.f.example.com',
      // Upper-case names (Active Directory) are common.
      'WEB-01.EXAMPLE.COM',
      'DC01.CORP.EXAMPLE.COM',
      // The identifying label must not be left in the clear when it is long.
      `${'a'.repeat(40)}.example.com`,
      `k8s-${'x'.repeat(50)}.corp.local`,
      // A trailing suffix after `.com` is part of the same name.
      'api.example.com.internal',
      // A qualified suffix in the middle must not end the name early.
      'web.prod.internal.example.com',
      'a.corp.local.example.org',
    ])('masks %s whole', (host) => {
      expectSpans(id, host, [host]);
    });

    it.each([
      ['https://kibana.example.com/app', ['kibana.example.com']],
      ['host.example.com:9200', ['host.example.com']],
      ['see docs.elastic.co.', ['docs.elastic.co']],
      ['user.name@example.com', ['example.com']],
    ])('finds only the host inside %j', (input, expected) => {
      expectSpans(id, input, expected);
    });

    // Regression coverage for a real production incident (field paths and file names corrupted in
    // tool output) plus the `.test.ts` / `logger.info` / locale-file classes found in review.
    it.each([
      // ECS/data-view field paths
      'signal.threshold_result.action_group',
      'entity.behavior.last_seen_timestamp',
      'user.effective.name',
      'process.session_leader.entity_id',
      'host.os.name',
      'host.id',
      'cloud.account.id',
      'source.ip',
      'display_name.text',
      // Source and config file names
      'index.ts',
      'README.md',
      'package.json',
      'scripts/install.sh',
      'foo.test.ts',
      'index.test.tsx',
      'use-foo.test.ts',
      'tsconfig.test.json',
      'kibana.dev.yml',
      'webpack.dev.js',
      'docker-compose.dev.yml',
      'config.local.yml',
      '.env.local',
      'application.local.properties',
      'messages.de.json',
      'strings.fr.xlf',
      // Logger calls
      'console.info(x)',
      'logger.info("a")',
      'this.logger.info',
      // Model names, versions, UUIDs, hyphenated prose, single-label names
      'gpt-4-turbo',
      'claude-3-5-sonnet-20241022',
      '123e4567-e89b-12d3-a456-426614174000',
      'well-known-multi-word-host-01-example',
      'myhost',
      'LAPTOP-ABC123',
      'host.example.id',
      'host.example.sh',
    ])('does not match %s', (input) => {
      expectSpans(id, input, []);
    });
  });

  describe('builtin-account-login', () => {
    const id = 'builtin-account-login';

    it.each(['CORP\\a.mehta', 'DOMAIN\\user', 'HOST\\user$', 'EXAMPLE\\j.smith-adm'])(
      'masks %s whole',
      (account) => {
        expectSpans(id, account, [account]);
      }
    );

    it('masks only the account part of a domain with a space in it', () => {
      expectSpans(id, 'NT AUTHORITY\\SYSTEM', ['AUTHORITY\\SYSTEM']);
    });

    it.each([
      'C:\\Users\\jon',
      'C:\\Program Files\\x',
      'C:\\temp\\log.txt',
      'path\\to\\file.txt',
      'src\\main\\java\\Foo.java',
      'line1\\nline2',
      'regex \\d\\w',
    ])('does not match %s', (input) => {
      expectSpans(id, input, []);
    });
  });

  // A pattern that is quadratic on one long token lets a single tool result exceed the worker's
  // task timeout (15 s by default). Before the rewrite the email pattern took ~19 s on the first
  // input below. The threshold is generous so it only fails on a real complexity regression.
  describe('long inputs', () => {
    const LONG_INPUTS: Record<string, string> = {
      'alphanumeric run': 'a'.repeat(100_000),
      'base64-like run': 'QUJD'.repeat(25_000),
      'dotted alphanumerics': 'a1.'.repeat(33_000),
      'dots only': '.'.repeat(100_000),
      'hyphenated run': 'a-'.repeat(50_000),
      'dotted numbers': '1.2.3.'.repeat(17_000),
      'short labels': 'ab.'.repeat(33_000),
    };

    it.each(BUILT_IN_IDS)('%s stays fast', (id) => {
      for (const input of Object.values(LONG_INPUTS)) {
        const start = performance.now();
        findAll(engine, patternFor(id), input);
        expect(performance.now() - start).toBeLessThan(engine === 'native' ? 500 : 5000);
      }
    });
  });
});

describe('built-in regex rules across engines', () => {
  const CORPUS = [
    "a.mehta@example.com o'brien@example.com müller@firma.de (j@x.io) git@github.com:x/y.git",
    '10.42.7.19 1.2.3.4.5 256.1.1.1 host-10.0.0.1 ::ffff:192.168.1.1 python 3.11.4.2',
    'web-01.prod.example.com DC01.CORP.EXAMPLE.COM foo.test.ts kibana.dev.yml logger.info',
    'api.example.com.internal https://kibana.example.com/app srv.example.es a.b.c.d.e.f.g.com',
    'CORP\\a.mehta C:\\Users\\jon NT AUTHORITY\\SYSTEM line1\\nline2',
  ];

  it.each(BUILT_IN_IDS)('%s matches the same text on native RegExp and RE2', (id) => {
    for (const input of CORPUS) {
      expect(findAll('re2', patternFor(id), input)).toEqual(
        findAll('native', patternFor(id), input)
      );
    }
  });

  it('ships every rule with a pattern that compiles on both engines', () => {
    for (const { pattern } of DEFAULT_BUILTIN_REGEX_RULES) {
      expect(() => new RegExp(pattern, 'g')).not.toThrow();
      expect(() => RE2JS.compile(pattern)).not.toThrow();
    }
  });
});
