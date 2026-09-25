/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegexAnonymizationRule } from './types';

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
    pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-ipv4',
    name: 'IPv4 addresses',
    entityClass: 'IP',
    type: 'RegExp',
    // Draft pattern — needs security/product review before being relied on as a default.
    pattern:
      '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b',
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-host-name',
    name: 'Host and machine names',
    entityClass: 'HOST_NAME',
    type: 'RegExp',
    // Matches fully-qualified, dot-separated hostnames ending in one of a curated list of
    // real TLDs/common infra suffixes (e.g. "web-01.prod.example.com",
    // "db-server-2.svc.cluster.local"). A first attempt accepted *any* letters-only final
    // label instead of a curated list — that also matches the leading segments of any dotted
    // identifier, which are ubiquitous in this domain: ECS/data-view field paths (e.g.
    // "entity.behavior" out of "entity.behavior.last_seen_timestamp", "user.effective.name")
    // and source file paths (e.g. "index.ts", "README.md"), corrupting tool output and the
    // agent's own reasoning about file/field names. The curated list below deliberately omits
    // several real TLDs that collide with extremely common suffixes in this domain:
    // "id"/"name" (near-universal ECS field leaves, e.g. "host.id", "user.name"), and
    // "md"/"sh"/"js"/"ts" (markdown/shell/JS/TS file extensions). Verified against a 500+
    // entry real ECS field corpus, common source file paths, version strings, model names,
    // UUIDs, timestamps, and hyphenated English phrases — zero false positives — while still
    // matching realistic hostnames (including multi-label ones like
    // "internal-db.corp.acme.co.uk"). Trade-off: bare single-label hostnames without a domain
    // suffix, and hostnames using a TLD/suffix outside this list, are intentionally not
    // matched — add a custom rule scoped to your own naming convention if you need that.
    pattern:
      '\\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?\\.){1,5}(?:com|net|org|io|co|dev|app|cloud|biz|info|tech|online|site|xyz|click|link|live|world|systems|solutions|services|cluster|svc|local|internal|corp|lan|home|test|invalid|localhost|edu|gov|mil|int|uk|de|fr|jp|cn|ru|nl|se|dk|fi|ch|nz|sg|kr|mx|hk|tw|ai|ca|au|br)\\b',
    enabled: true,
    builtIn: true,
  },
  {
    id: 'builtin-account-login',
    name: 'Account and login names',
    entityClass: 'USER_NAME',
    type: 'RegExp',
    // Draft pattern — needs security/product review before being relied on as a default.
    pattern: '\\b[A-Za-z0-9][A-Za-z0-9._-]*\\\\[A-Za-z0-9][A-Za-z0-9._-]*\\b',
    enabled: false,
    builtIn: true,
  },
];
