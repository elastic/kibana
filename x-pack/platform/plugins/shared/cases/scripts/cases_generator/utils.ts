/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from './logger';
import { rng } from './seeded_random';
import { TEMPLATE_FIELD_USER_TYPES, type TemplateFieldUserType } from './types';

export { rng, installSeededRandom } from './seeded_random';

export const AUTO_GENERATED_TAG = 'auto-generated';

// Maps the user-facing control name to the Elasticsearch value type that ends up
// on the template field. Must stay in sync with buildTemplateField in kibana_ops.ts.
export const USER_TYPE_TO_SCHEMA_TYPE: Record<TemplateFieldUserType, string> = {
  text: 'keyword',
  number: 'integer',
  textarea: 'keyword',
  date: 'date',
  select: 'keyword',
  radio: 'keyword',
  checkbox: 'keyword',
  user: 'keyword',
};

// Returns a short alphanumeric token of (up to) `length` characters. Used to
// build the per-run reqId that gets stamped into case titles/descriptions so
// you can tell which run created which case.
export const randomString = (length: number) =>
  rng()
    .toString(36)
    .substring(2, length + 2);

// Returns one element of `arr`, selected uniformly at random. Used everywhere
// we need a random label/severity/category from a small pool.
export const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

// Returns a copy of `values` with duplicates removed (first-seen order kept).
// Used for deduping owner/space lists assembled from CLI flags + config.
export function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

// Splits `arr` into consecutive sub-arrays of at most `size` elements. Used to
// keep bulk requests (attachments, alert/event indexing, deletes) under server
// limits.
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be positive');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Returns `n` distinct random elements drawn from `arr`. Used to pick a random
// subset of tags for each generated case.
export function sampleN<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  if (n >= arr.length) return [...arr];
  // Partial Fisher-Yates: shuffle the last n positions, take that suffix.
  const copy = [...arr];
  for (let i = copy.length - 1; i >= copy.length - n; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(copy.length - n);
}

// Picks one owner from `owners`, optionally biased by a weight map. Used by
// the run loop and buildExecutionPlan to assign each generated case to an
// owner. Falls back to a uniform pick when no distribution (or zero total
// weight) is supplied.
export function weightedOwnerPick(
  owners: string[],
  distribution: Record<string, number> | null
): string {
  if (owners.length === 0) {
    throw new Error('Cannot pick an owner from an empty owner list');
  }

  if (!distribution) return pick(owners);
  const totalWeight = owners.reduce((sum, owner) => sum + (distribution[owner] ?? 0), 0);
  if (totalWeight <= 0) return pick(owners);

  let rand = rng() * totalWeight;
  for (const owner of owners) {
    rand -= distribution[owner] ?? 0;
    if (rand <= 0) return owner;
  }

  return owners[owners.length - 1];
}

// Parses the --ownerDistribution CLI flag (e.g. "securitySolution:60,cases:40")
// into a weight map. Returns null when the input is empty or has no usable
// pairs. Consumed by weightedOwnerPick.
export function parseOwnerDistribution(str: string): Record<string, number> | null {
  if (!str) return null;
  const result: Record<string, number> = {};
  const pairs = str
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const pair of pairs) {
    const colonIdx = pair.lastIndexOf(':');
    if (colonIdx > 0) {
      const owner = pair.slice(0, colonIdx).trim();
      const weight = parseFloat(pair.slice(colonIdx + 1).trim());
      if (owner && !Number.isNaN(weight)) {
        result[owner] = weight;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// Returns `url` with the username/password and/or protocol replaced. Used by
// clients.ts when constructing the Kibana and Elasticsearch client URLs from
// CLI flags (e.g. injecting basic-auth or upgrading http→https for SSL).
export function updateURL({
  url,
  user,
  protocol,
}: {
  url: string;
  user?: { username: string; password: string };
  protocol?: string;
}): string {
  const urlObject = new URL(url);
  if (user) {
    urlObject.username = user.username;
    urlObject.password = user.password;
  }
  if (protocol) {
    urlObject.protocol = protocol;
  }
  return urlObject.href;
}

// Turns an HTTP/Axios error into a human-readable single-line string with the
// status and (when present) response body. Used by every catch block that logs
// failed Kibana/ES requests, and by runWithRetry to decide whether to retry.
export function formatRequestError(err: unknown): string {
  const error = err as Error & {
    axiosError?: { status?: number };
    response?: { data?: unknown; status?: number };
  };

  const parts = [error.message];
  const status = error.axiosError?.status ?? error.response?.status;

  if (status && !error.message.includes(String(status))) {
    parts.push(`status=${status}`);
  }
  if (error.response?.data) {
    parts.push(`body=${JSON.stringify(error.response.data)}`);
  }

  return parts.join(' | ');
}

const RETRYABLE_PATTERNS = ['429', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT'];

// True when the error looks transient (rate-limit, gateway error, dropped
// connection). Used by runWithRetry to decide whether another attempt is worth
// making.
function shouldRetry(err: unknown): boolean {
  const message = formatRequestError(err);
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

// Runs `operation`, retrying with exponential backoff on transient errors and
// rethrowing immediately on anything else. Wraps every Kibana/ES write in this
// script so a single 503 or ECONNRESET doesn't fail the run. `label` shows up
// in the warning log so you can tell which call was retried.
export async function runWithRetry<T>(
  operation: () => Promise<T>,
  {
    retries = 2,
    label,
  }: {
    retries?: number;
    label: string;
  }
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) {
        throw err;
      }
      attempt += 1;
      const delayMs = 250 * 2 ** (attempt - 1);
      logger.warning(
        `Retrying "${label}" after failure (${attempt}/${retries}): ${formatRequestError(err)}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Treats the literal string "default" the same as an empty space ID. Used by
// config.ts when canonicalizing user-supplied space inputs so downstream code
// can rely on `''` meaning "the default space".
export function normalizeSpace(space: string): string {
  return space === 'default' ? '' : space;
}

// Returns the URL prefix for a target space ('' for the default space, or
// '/s/<space>' otherwise). Used to build every Kibana request path so the
// same code works in single-space and multi-space runs.
export function casesBasePath(space: string): string {
  return space ? `/s/${space}` : '';
}

// Converts a 0-based index into an Excel-style column label (0→A, 25→Z,
// 26→AA, …). Used by templateFieldName to give each generated template field
// a stable, human-readable suffix.
export function fieldLetter(index: number): string {
  // Excel-style: 0→A, 25→Z, 26→AA, 51→AZ, 52→BA, …, 701→ZZ, 702→AAA.
  let n = index;
  let result = '';
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

// Returns the canonical name for the Nth field of a generated template
// (e.g. `fieldA`, `fieldB`, …). Used both when building template definitions
// (kibana_ops.ts) and when populating extended_fields on cases (data_generation.ts)
// so both sides agree on field names.
export function templateFieldName(index: number): string {
  return `field${fieldLetter(index)}`;
}

// Mirrors the cases plugin's getFieldSnakeKey helper — extended_fields keys must
// match `${name}_as_${schemaType}` to be accepted by the server. Used when
// building the extended_fields payload for templated cases.
export function extendedFieldKey(index: number, userType: TemplateFieldUserType): string {
  return `${templateFieldName(index)}_as_${USER_TYPE_TO_SCHEMA_TYPE[userType]}`;
}

// Splits a comma-separated CLI value into a trimmed, non-empty string array.
// Used to parse multi-value flags like --owners or --analyticsOwners.
export function parseList(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Parses `value` as a non-negative integer, returning `fallback` for anything
// invalid (negatives, NaN, garbage). Used by config parsing and by the
// interactive wizard's number prompts.
export function parseNonNegativeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

// Parses a comma-separated list of template field types (e.g. "text,number,date")
// into the typed array createTemplates expects, warning on unknown values.
// Used by both the CLI (--templateFieldTypes) and the interactive wizard.
export function parseTemplateFieldTypes(input: string): TemplateFieldUserType[] {
  if (!input) return [];
  const valid = new Set<string>(TEMPLATE_FIELD_USER_TYPES);
  const result: TemplateFieldUserType[] = [];
  for (const raw of parseList(input)) {
    const normalized = raw.toLowerCase();
    if (valid.has(normalized)) {
      result.push(normalized as TemplateFieldUserType);
    } else {
      logger.warning(
        `Skipping unknown template field type "${raw}". Valid types: ${TEMPLATE_FIELD_USER_TYPES.join(
          ', '
        )}`
      );
    }
  }
  return result;
}
