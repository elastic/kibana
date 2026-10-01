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
import { loadInferenceEndpoints } from '../utils/inference_endpoint_definition';

const NOW = 1_750_000_000_000;
const TTL_MS = 168 * 60 * 60 * 1000;

describe('eis_connectors_cache', () => {
  let cachePath: string;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    cachePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'eis-cache-')), 'cache.json');
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
    fs.rmSync(path.dirname(cachePath), { recursive: true, force: true });
  });

  const writeCache = (payload: unknown) => {
    fs.writeFileSync(cachePath, JSON.stringify(payload));
  };

  const freshEntry = (inferenceId: string) => ({
    name: `EIS ${inferenceId}`,
    inferenceId,
    provider: 'elastic',
    taskType: 'chat_completion',
  });

  const freshPayload = () => ({
    connectors: { 'eis-x': freshEntry('.x') },
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

    it('returns malformed when runtime field types are wrong', () => {
      // valid JSON, but fetched_at_ms is a string: Date.now() - 'not-a-number' is NaN,
      // which silently passes the TTL comparison if only truthiness is checked
      writeCache({ connectors: [], fetched_at_ms: 'not-a-number' });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      writeCache({ connectors: { 'eis-x': {} }, fetched_at_ms: String(NOW) });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      // connectors must be a plain object, not an array or scalar
      writeCache({ connectors: [], fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      writeCache({ connectors: 'nope', fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      // top level must be an object
      writeCache([freshPayload()]);
      expect(getEisCacheStatus(cachePath)).toBe('malformed');

      // non-finite numbers (JSON.stringify of NaN becomes null) must not pass
      writeCache({ connectors: { 'eis-x': {} }, fetched_at_ms: null });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
    });
  });

  describe('readCachedEisConnectors', () => {
    it('returns connectors only when fresh', () => {
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();

      writeCache(freshPayload());
      expect(readCachedEisConnectors(cachePath)).toEqual({ 'eis-x': freshEntry('.x') });

      writeCache({ ...freshPayload(), fetched_at_ms: NOW - TTL_MS - 1 });
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();
    });

    it('returns undefined when runtime field types are wrong', () => {
      writeCache({ connectors: [], fetched_at_ms: 'not-a-number' });
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();
    });

    it('treats an empty connector map as malformed', () => {
      // `{"connectors":{},"fetched_at_ms":<now>}` would otherwise export an
      // empty KIBANA_TESTING_INFERENCE_ENDPOINTS payload on an EIS-backed run.
      writeCache({ connectors: {}, fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();
    });

    it('treats connector entries loadInferenceEndpoints cannot install as malformed', () => {
      // A nonempty map used to be accepted as-is, so `{"eis-x": null}` was
      // exported and then crashed loadInferenceEndpoints() at Playwright startup
      // ("Cannot read properties of null") instead of reporting a cache error.
      writeCache({ connectors: { 'eis-x': null }, fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();

      // Scalar entry.
      writeCache({ connectors: { 'eis-x': 'nope' }, fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();

      // Valid-looking object missing a field the loader requires.
      const { provider, ...withoutProvider } = freshEntry('.x');
      writeCache({ connectors: { 'eis-x': withoutProvider }, fetched_at_ms: NOW });
      expect(getEisCacheStatus(cachePath)).toBe('malformed');
      expect(readCachedEisConnectors(cachePath)).toBeUndefined();
    });

    it('accepts a cache that loadInferenceEndpoints can install', () => {
      // The cache check stays in parity with the loader: what the cache calls
      // fresh must survive being exported as the endpoints payload.
      writeCache(freshPayload());

      const connectors = readCachedEisConnectors(cachePath);
      expect(connectors).toBeDefined();
      process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = Buffer.from(
        JSON.stringify(connectors)
      ).toString('base64');

      expect(loadInferenceEndpoints()).toEqual([
        {
          id: 'eis-x',
          name: 'EIS .x',
          inferenceId: '.x',
          provider: 'elastic',
          taskType: 'chat_completion',
          type: 'inference_endpoint',
        },
      ]);
    });
  });
});
