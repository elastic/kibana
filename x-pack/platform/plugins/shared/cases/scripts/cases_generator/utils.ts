/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logger } from './logger';

export const AUTO_GENERATED_TAG = 'auto-generated';

let scriptRandom: () => number = Math.random;

export function rng(): number {
  return scriptRandom();
}

export const randomString = (length: number) =>
  rng()
    .toString(36)
    .substring(2, length + 2);

export const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

export function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be positive');
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

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

function shouldRetry(err: unknown): boolean {
  const message = formatRequestError(err);
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

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

export function normalizeSpace(space: string): string {
  return space === 'default' ? '' : space;
}

export function casesBasePath(space: string): string {
  return space ? `/s/${space}` : '';
}

export function parseList(input: string): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseNonNegativeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1_779_033_703;
  let h2 = 3_144_134_277;
  let h3 = 1_013_904_242;
  let h4 = 2_773_480_762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597_399_067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2_869_860_233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951_274_213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2_716_044_179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597_399_067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2_869_860_233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951_274_213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2_716_044_179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4_294_967_296;
  };
}

export function installSeededRandom(seed: string): () => void {
  const previous = scriptRandom;
  const [a, b, c, d] = cyrb128(seed);
  scriptRandom = sfc32(a, b, c, d);
  return () => {
    scriptRandom = previous;
  };
}
