/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import { setImmediate as setImmediatePromise } from 'timers/promises';

export const OFFENDER_KINDS = [
  'cpu_spin',
  'json_stringify',
  'regex_backtrack',
  'microtask_chain',
  'infinite_loop',
] as const;
export type OffenderKind = (typeof OFFENDER_KINDS)[number];

export interface OffenderParams {
  readonly kind: OffenderKind;
  readonly doseMs: number;
  /** json_stringify only: serialized payload size per stringify call (MB). */
  readonly sizeMb?: number;
}

export interface OffenderResult {
  readonly kind: OffenderKind;
  readonly doseMs: number;
  /** Wall time of the synchronous (or microtask-only) blocking section. */
  readonly blockedMs: number;
  /** Time spent preparing inputs in yielding chunks (not part of the block). */
  readonly prepMs: number;
  readonly detail: Record<string, number>;
}

const cpuSpin = (doseMs: number): Record<string, number> => {
  const end = performance.now() + doseMs;
  let iterations = 0;
  let acc = 0;
  while (performance.now() < end) {
    acc = (acc + Math.sqrt(iterations)) % 1e9;
    iterations++;
  }
  return { iterations, acc: acc > 0 ? 1 : 0 };
};

const buildJsonPayload = async (sizeMb: number): Promise<unknown[]> => {
  // ~200 bytes serialized per row; built in yielding chunks so only stringify blocks.
  const rows = Math.ceil((sizeMb * 1024 * 1024) / 200);
  const out: unknown[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    out[i] = {
      id: i,
      name: 'row-' + i,
      tags: ['alpha', 'beta', 'gamma'],
      nested: { a: i % 7, b: 'value-' + (i % 13), c: i / 3 },
      flag: i % 2 === 0,
      text: 'lorem ipsum dolor sit amet',
    };
    if (i % 20000 === 0) await setImmediatePromise();
  }
  return out;
};

let jsonCache: { sizeMb: number; payload: unknown[]; msPerCall: number; bytes: number } | undefined;

const jsonStringify = async (
  doseMs: number,
  sizeMb: number
): Promise<{ blockedMs: number; prepMs: number; detail: Record<string, number> }> => {
  const prepStart = performance.now();
  if (!jsonCache || jsonCache.sizeMb !== sizeMb) {
    jsonCache = undefined;
    const payload = await buildJsonPayload(sizeMb);
    await setImmediatePromise();
    const t0 = performance.now();
    const bytes = JSON.stringify(payload).length;
    const msPerCall = performance.now() - t0;
    jsonCache = { sizeMb, payload, msPerCall, bytes };
    await setImmediatePromise();
  }
  const prepMs = performance.now() - prepStart;
  const calls = Math.max(1, Math.round(doseMs / Math.max(jsonCache.msPerCall, 0.001)));
  const t0 = performance.now();
  let total = 0;
  for (let i = 0; i < calls; i++) total += JSON.stringify(jsonCache.payload).length;
  const blockedMs = performance.now() - t0;
  return {
    blockedMs,
    prepMs,
    detail: { calls, bytesPerCall: jsonCache.bytes, totalBytes: total, calibratedMsPerCall: jsonCache.msPerCall },
  };
};

// Catastrophic backtracking: cost roughly doubles per extra character.
const EVIL_REGEX = /^(a+)+$/;
const regexCost = new Map<number, number>();
const timeRegex = (n: number): number => {
  const input = 'a'.repeat(n) + '!';
  const t0 = performance.now();
  EVIL_REGEX.test(input);
  return performance.now() - t0;
};

const regexBacktrack = (doseMs: number): Record<string, number> => {
  // Calibrate at n=18 (~ a few ms), then pick n so a single exec is <= dose; repeat to fill.
  if (!regexCost.has(18)) regexCost.set(18, Math.max(timeRegex(18), 0.01));
  const base = regexCost.get(18) as number;
  const n = Math.max(10, Math.min(32, 18 + Math.floor(Math.log2(Math.max(doseMs, 1) / base))));
  const input = 'a'.repeat(n) + '!';
  const end = performance.now() + doseMs;
  let execs = 0;
  do {
    EVIL_REGEX.test(input);
    execs++;
  } while (performance.now() < end);
  return { n, execs, calibratedMsAt18: base };
};

const microtaskChain = async (doseMs: number): Promise<Record<string, number>> => {
  const end = performance.now() + doseMs;
  let hops = 0;
  while (performance.now() < end) {
    await Promise.resolve();
    hops++;
  }
  return { hops };
};

/** Runs one synthetic offender with the requested dose on the calling thread. */
export const runOffender = async (params: OffenderParams): Promise<OffenderResult> => {
  const { kind, doseMs } = params;
  switch (kind) {
    case 'cpu_spin': {
      const t0 = performance.now();
      const detail = cpuSpin(doseMs);
      return { kind, doseMs, blockedMs: performance.now() - t0, prepMs: 0, detail };
    }
    case 'json_stringify': {
      const { blockedMs, prepMs, detail } = await jsonStringify(doseMs, params.sizeMb ?? 16);
      return { kind, doseMs, blockedMs, prepMs, detail };
    }
    case 'regex_backtrack': {
      const t0 = performance.now();
      const detail = regexBacktrack(doseMs);
      return { kind, doseMs, blockedMs: performance.now() - t0, prepMs: 0, detail };
    }
    case 'microtask_chain': {
      const t0 = performance.now();
      const detail = await microtaskChain(doseMs);
      return { kind, doseMs, blockedMs: performance.now() - t0, prepMs: 0, detail };
    }
    case 'infinite_loop': {
      // Non-terminating offender (cf. SDH #5161). doseMs is only a safety cap so a
      // local stack eventually recovers; external supervision is expected to kill first.
      const t0 = performance.now();
      const detail = cpuSpin(doseMs);
      return { kind, doseMs, blockedMs: performance.now() - t0, prepMs: 0, detail };
    }
  }
};
