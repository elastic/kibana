/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import type { ToolingLog } from '@kbn/tooling-log';

// `CACHE_DIR` is derived from `os.homedir()` at module load, so the mock must
// precede the import below. A fixed path under tmpdir keeps this deterministic;
// `writeCachedEisConnectors` mkdirs recursively, so it need not exist up front.
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: () => `${actual.tmpdir()}/eis-connectors-cache-test` };
});

import { readCachedEisConnectors, writeCachedEisConnectors } from './eis_connectors_cache';

const FAKE_HOME = Os.homedir();
const CACHE_PATH = Path.join(FAKE_HOME, '.elastic', 'eis-connectors-cache.json');

const makeLog = (): ToolingLog =>
  ({
    warning: jest.fn(),
    info: jest.fn(),
  } as unknown as ToolingLog);

describe('eis_connectors_cache', () => {
  afterEach(() => {
    if (Fs.existsSync(CACHE_PATH)) {
      Fs.unlinkSync(CACHE_PATH);
    }
  });

  afterAll(() => {
    Fs.rmSync(FAKE_HOME, { recursive: true, force: true });
  });

  it('returns undefined when no cache file exists', () => {
    expect(readCachedEisConnectors()).toBeUndefined();
  });

  it('round-trips a fresh cache write/read', () => {
    const connectors = { 'eis-anthropic-claude-4-5-haiku': { name: 'Haiku' } };
    writeCachedEisConnectors(connectors);

    expect(readCachedEisConnectors()).toEqual(connectors);
  });

  it('treats a cache older than the 7-day TTL as absent', () => {
    const connectors = { 'eis-anthropic-claude-4-5-haiku': { name: 'Haiku' } };
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    Fs.mkdirSync(Path.dirname(CACHE_PATH), { recursive: true });
    Fs.writeFileSync(
      CACHE_PATH,
      JSON.stringify({ connectors, fetched_at_ms: eightDaysAgo }),
      'utf-8'
    );

    expect(readCachedEisConnectors()).toBeUndefined();
  });

  it('logs a warning identifying expiry (not silence) when the cache is stale', () => {
    // Regression test: an earlier version returned `undefined` on TTL expiry with zero
    // diagnostics, making an expired cache indistinguishable from "never cached" and
    // making the resulting Vault/EIS re-discovery look like an unexplained hang.
    const connectors = { 'eis-anthropic-claude-4-5-haiku': { name: 'Haiku' } };
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    Fs.mkdirSync(Path.dirname(CACHE_PATH), { recursive: true });
    Fs.writeFileSync(
      CACHE_PATH,
      JSON.stringify({ connectors, fetched_at_ms: eightDaysAgo }),
      'utf-8'
    );

    const log = makeLog();
    readCachedEisConnectors(log);

    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('expired'));
  });

  it('does not warn when the cache is within TTL', () => {
    const connectors = { 'eis-anthropic-claude-4-5-haiku': { name: 'Haiku' } };
    writeCachedEisConnectors(connectors);

    const log = makeLog();
    readCachedEisConnectors(log);

    expect(log.warning).not.toHaveBeenCalled();
  });

  it('returns undefined for a corrupt (non-JSON) cache file without throwing', () => {
    Fs.mkdirSync(Path.dirname(CACHE_PATH), { recursive: true });
    Fs.writeFileSync(CACHE_PATH, 'not json', 'utf-8');

    expect(() => readCachedEisConnectors()).not.toThrow();
    expect(readCachedEisConnectors()).toBeUndefined();
  });

  it('returns undefined when required fields are missing', () => {
    Fs.mkdirSync(Path.dirname(CACHE_PATH), { recursive: true });
    Fs.writeFileSync(CACHE_PATH, JSON.stringify({ connectors: {} }), 'utf-8');

    expect(readCachedEisConnectors()).toBeUndefined();
  });

  it('writes the cache file with owner-only permissions (0o600)', () => {
    writeCachedEisConnectors({ 'eis-x': { name: 'x' } });

    const mode = Fs.statSync(CACHE_PATH).mode;
    const ownerOnly = mode % 0o1000; // last 3 octal digits: owner/group/other rwx
    expect(ownerOnly).toBe(0o600);
  });
});
