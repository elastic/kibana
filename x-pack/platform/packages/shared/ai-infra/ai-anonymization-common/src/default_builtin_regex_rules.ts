/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from './types';

/**
 * Pattern-writing constraints shared by every built-in rule below. They exist so a rule runs
 * identically on native `RegExp` and on RE2 (`re2js`), and so no input can make it slow:
 *
 * - No lookahead, lookbehind or backreferences (RE2 has none).
 * - No `\uXXXX`, `\p{..}` or inline `(?i)` — those are spelled differently per engine. Non-ASCII
 *   ranges are embedded as literal characters and case-insensitivity is spelled out per letter.
 * - Every quantifier that can see attacker-controlled text is bounded, and a match can only start
 *   at a word boundary or after a fixed delimiter, so a backtracking engine does bounded work at
 *   every start position instead of rescanning the whole run (the previous email pattern took
 *   ~19 s on a 200 KB alphanumeric run).
 *
 * `default_builtin_regex_rules.test.ts` enforces all three on both engines.
 */

/** Matches `word` regardless of case without needing an `i` flag, e.g. `com` -> `[cC][oO][mM]`. */
const anyCase = (word: string): string =>
  [...word].map((char) => `[${char.toLowerCase()}${char.toUpperCase()}]`).join('');

const anyCaseAlternation = (words: string[]): string => `(?:${words.map(anyCase).join('|')})`;

// Non-ASCII letters, written as literal characters because `\uXXXX` is not valid in RE2: Latin with
// diacritics (Latin-1 and Latin Extended-A: Western and Central European names), Greek and Cyrillic.
// The pattern is shown in the UI, so only widely-rendered characters are used. Other scripts (CJK,
// Arabic, Hebrew, ...) are not covered; add a custom rule for those.
const NON_ASCII = 'À-ſΑ-я';

const EMAIL_LOCAL_CHAR = `[\\w.%+'${NON_ASCII}-]`;
const EMAIL_DOMAIN_ALNUM = `[A-Za-z0-9${NON_ASCII}]`;
const EMAIL_DOMAIN_CHAR = `[A-Za-z0-9${NON_ASCII}-]`;
const EMAIL_PATTERN =
  // RFC 5321 caps the local part at 64 characters and a domain label at 63.
  `${EMAIL_LOCAL_CHAR}{1,64}@` +
  `(?:${EMAIL_DOMAIN_ALNUM}(?:${EMAIL_DOMAIN_CHAR}{0,61}${EMAIL_DOMAIN_ALNUM})?\\.){1,8}` +
  `[A-Za-z${NON_ASCII}]{2,24}`;

const IPV4_OCTET = '(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)';
// A trailing `.<digits>` group is consumed so a longer dotted-number run (e.g. `1.2.3.4.5`) is
// masked whole instead of leaving `.5` behind.
const IPV4_PATTERN = `\\b(?:${IPV4_OCTET}\\.){3}${IPV4_OCTET}(?:\\.[0-9]{1,3}){0,4}\\b`;

const HOST_LABEL = '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?';

// Suffixes that are safe to match after a single label (`github.io`, `docs.elastic.co`).
const HOST_COMMON_SUFFIXES = ['com', 'net', 'org', 'io', 'co', 'edu', 'gov', 'mil', 'biz', 'xyz'];

// Suffixes that collide with ubiquitous file/identifier names when preceded by a single label
// (`kibana.dev.yml`, `config.local.yml`, `messages.de.json`, `console.tech`), so they only count
// after at least two labels (`web-01.corp.local`, `api.example.de`). Country codes that are also
// common file extensions (`ts`, `js`, `py`, `md`, `sh`, `rb`, `rs`, `cs`, `so`, `ml`) and `id`
// (every ECS `*.id` field) are intentionally absent. `test`, `invalid` and `localhost` are
// reserved names that cannot identify a real host, and `info` collides with `logger.info`.
const HOST_QUALIFIED_SUFFIXES = [
  'cloud',
  'dev',
  'app',
  'ai',
  'int',
  'local',
  'internal',
  'corp',
  'lan',
  'home',
  'svc',
  'cluster',
  'tech',
  'online',
  'site',
  'live',
  'link',
  'click',
  'world',
  'systems',
  'solutions',
  'services',
  'eu',
  'us',
  'uk',
  'de',
  'fr',
  'jp',
  'cn',
  'ru',
  'nl',
  'se',
  'dk',
  'fi',
  'ch',
  'nz',
  'sg',
  'kr',
  'mx',
  'hk',
  'tw',
  'ca',
  'au',
  'br',
  'es',
  'it',
  'be',
  'at',
  'no',
  'ie',
  'pt',
  'gr',
  'cz',
  'hu',
  'ro',
  'bg',
  'sk',
  'si',
  'hr',
  'rs',
  'ua',
  'tr',
  'il',
  'in',
  'ph',
  'th',
  'vn',
  'pk',
  'bd',
  'ae',
  'sa',
  'za',
  'ng',
  'ke',
  'eg',
  'ar',
  'cl',
  'pe',
  've',
  'pl',
  'me',
  'tv',
];

const QUALIFIED_SUFFIX = anyCaseAlternation(HOST_QUALIFIED_SUFFIXES);

// Both engines take the first alternative that matches, so the order decides what is masked as one
// name. The common-suffix alternative comes first and its greedy label run reaches the last common
// suffix, so `web.prod.internal.example.com` is one match rather than `web.prod.internal` plus
// `example.com`. It may then absorb up to three qualified suffixes (`api.example.com.internal`).
// A name with no common suffix (`web-01.corp.local`) falls through to the second alternative,
// which needs two labels before a qualified suffix.
const HOST_PATTERN =
  `\\b(?:${HOST_LABEL}\\.){1,10}${anyCaseAlternation(HOST_COMMON_SUFFIXES)}` +
  `(?:\\.${QUALIFIED_SUFFIX}){0,3}\\b` +
  `|\\b(?:${HOST_LABEL}\\.){2,10}${QUALIFIED_SUFFIX}\\b`;

// `DOMAIN\account` with an upper-case NetBIOS-style domain of at least two characters, so drive
// letters (`C:\`), lower-case path segments and escape sequences (`\n`, `\d`) are not matched.
const ACCOUNT_LOGIN_PATTERN = '\\b[A-Z][A-Z0-9-]{1,14}\\\\[A-Za-z0-9][A-Za-z0-9._$-]{0,63}';

/**
 * Canonical, currently-shipped definitions of every built-in regex anonymization rule.
 *
 * This is the single source of truth `refreshBuiltInAnonymizationRules` uses to re-derive a
 * built-in rule's `pattern`/`name`/`entityClass` at read-time — see that function's doc
 * comment for why a code-level fix to one of these patterns would otherwise never reach an
 * environment that already saved the `ai:anonymizationSettings` uiSetting once. Both the
 * inference plugin's `getUiSettings()` default value and the settings UI rely on this array;
 * keep it here (rather than duplicated in either) so they can't drift apart.
 */
export const DEFAULT_BUILTIN_REGEX_RULES: RegexAnonymizationRule[] = [
  {
    id: 'builtin-email',
    name: 'Email addresses',
    entityClass: 'EMAIL',
    type: 'RegExp',
    pattern: EMAIL_PATTERN,
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-ipv4',
    name: 'IPv4 addresses',
    entityClass: 'IP',
    type: 'RegExp',
    // IPv6 is not covered. Four-part version numbers (e.g. `3.11.4.2`) are indistinguishable from
    // addresses and are masked.
    pattern: IPV4_PATTERN,
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-host-name',
    name: 'Host and machine names',
    entityClass: 'HOST_NAME',
    type: 'RegExp',
    // Fully-qualified, dot-separated host names ending in a curated list of suffixes. A first
    // attempt accepted any letters-only final label, which also matched ECS field paths
    // ("user.effective.name") and file names ("index.ts") and corrupted tool output; the curated
    // lists above exist to avoid that. Known limits: bare single-label names ("server01"),
    // single-label `.local`/`.dev` names ("nas.local"), and suffixes outside the lists are not
    // matched — add a custom rule for your own naming convention. A dotted identifier whose last
    // part is a listed suffix after two or more labels (e.g. a Java package `com.acme.app`) is
    // still masked.
    pattern: HOST_PATTERN,
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-account-login',
    name: 'Account and login names',
    entityClass: 'USER_NAME',
    type: 'RegExp',
    // Windows `DOMAIN\account` form only. Off by default because an all-caps path segment
    // followed by a backslash (`C:\WINDOWS\System32`) is indistinguishable from an account.
    pattern: ACCOUNT_LOGIN_PATTERN,
    enabled: false,
    builtIn: true,
  },
];
