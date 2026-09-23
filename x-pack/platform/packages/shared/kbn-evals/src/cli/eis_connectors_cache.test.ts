/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { getEisCacheStatus, readCachedEisConnectors } from './eis_connectors_cache';

const NOW = 1_750_000_000_000;
const TTL_MS = 168 * 60 * 60 * 1000;

describe('eis_connectors_cache', () => {
  let cachePath: string;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    cachePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eis-cache-')), 'cache.json');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(path.dirname(cachePath), { recursive: true, force: true });
  });

  const writeCache = (payload: unknown) => {
    fs.writeFileSync(cachePath, JSON.stringify(payload));
  };

  const freshPayload = () => ({
    connectors: { 'eis-x': { inferenceId: 'x' } },
    fetched_at_ms: NOW,
  });

  describe('getEisCacheStatus', () => {
    it('returns missing when the file does not exist', () => {
      expect(getEisCacheStatus(cachePath)).toBe('missing');
    });

    it('returns fresh for a recent cache', () => {
      writeCache(freshPayload());
      expect(getEisCacheStatus(cachePath)).toBe('fresh');
    });

    it('returns expired beyond the 7-day TTL', () => {
      writeCache({ ...freshPayload(), fetched_at_ms: NOW - TTL_MS - 1 });
      expect(getEisCacheStatus(cachePath)).toBe('expired');
    });

    it('returns malformed for invalid JSON or missing fields', () => {
      fs.writeFileSync(cachePath, 'not json');
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      writeCache({ fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
    });
  });

  describe('readCachedEisConnectors', () => {
    it('returns connectors only when fresh', () => {
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();

      writeCache(freshPayload());
      expect(readCachedEisConnectors(cachePath)).toEqual({ 'eis-x': { inferenceId: 'x' } });

      writeCache({ ...freshPayload(), fetched_at_ms: NOW - TTL_MS - 1 });
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();
    });
  });
});
