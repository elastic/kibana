/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Single source of truth for the built-in regex patterns used by both the
 * programmatic default handler (`default_handlers.ts`) and the YAML-facing
 * `ai.pii` step (`steps/pii/ai_pii/index.ts`). Phase 2 cleanup (RFC line 248)
 * will move this into a shared `@kbn/ai-infra/pii-detection` package.
 */

export interface RegexRule {
  pattern: string;
  entityClass: string;
}

export const IP_PATTERN = '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b';

export const EMAIL_PATTERN = '\\b[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}\\b';

/**
 * Hostname pattern restricted to a curated TLD list with a leading-slash/dot
 * guard so file paths (e.g. `/skills/.../foo.io/x.md`) and dotted identifiers
 * (e.g. `package.json`, `platform.core.search`) are not matched. RFC §4.4
 * `custom_patterns` is the escape hatch for internal hostnames whose final
 * label is not in this list.
 */
export const HOST_NAME_PATTERN =
  '(?<![/\\\\.])\\b' +
  '(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+' +
  '(?:com|org|net|edu|gov|io|ai|co|app|dev|info|biz|me' +
  '|us|uk|de|fr|jp|cn|in|ru|br|au|ca|nl|se|no|dk|fi|es|it|ch|be' +
  '|local|internal|corp|lan)' +
  '\\b';

export const ENTITY_PATTERNS: Readonly<Record<string, RegexRule>> = {
  IP: { entityClass: 'IP', pattern: IP_PATTERN },
  EMAIL: { entityClass: 'EMAIL', pattern: EMAIL_PATTERN },
  HOST_NAME: { entityClass: 'HOST_NAME', pattern: HOST_NAME_PATTERN },
} as const;

export const DEFAULT_RULES: readonly RegexRule[] = [
  ENTITY_PATTERNS.IP,
  ENTITY_PATTERNS.EMAIL,
  ENTITY_PATTERNS.HOST_NAME,
];
