/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { durationSchema, metadataSchema, semVerSchema, historySettingsSchema } from './common';

describe('schemas', () => {
  describe('metadataSchema', () => {
    it('should error on empty string', () => {
      const result = metadataSchema.safeParse('');
      expect(result.success).toBeFalsy();
      expect(result).toMatchSnapshot();
    });
    it('should error on empty string for source', () => {
      const result = metadataSchema.safeParse({ source: '' });
      expect(result.success).toBeFalsy();
      expect(result).toMatchSnapshot();
    });
    it('should error on empty string for destination', () => {
      const result = metadataSchema.safeParse({ source: 'host.name', destination: '', limit: 10 });
      expect(result.success).toBeFalsy();
      expect(result).toMatchSnapshot();
    });
    it('should error when limit is too low', () => {
      const result = metadataSchema.safeParse({
        source: 'host.name',
        destination: 'host.name',
        aggregation: { type: 'terms', limit: 0 },
      });
      expect(result.success).toBeFalsy();
      expect(result).toMatchSnapshot();
    });
    it('should parse successfully with an valid string', () => {
      const result = metadataSchema.safeParse('host.name');
      expect(result.success).toBeTruthy();
      expect(result).toMatchSnapshot();
    });
    it('should parse successfully with just a source', () => {
      const result = metadataSchema.safeParse({ source: 'host.name' });
      expect(result.success).toBeTruthy();
      expect(result).toMatchSnapshot();
    });
    it('should parse successfully with a source and desitination', () => {
      const result = metadataSchema.safeParse({ source: 'host.name', destination: 'hostName' });
      expect(result.success).toBeTruthy();
      expect(result).toMatchSnapshot();
    });
    it('should parse successfully with valid object', () => {
      const result = metadataSchema.safeParse({
        source: 'host.name',
        destination: 'hostName',
      });
      expect(result.success).toBeTruthy();
      expect(result).toMatchSnapshot();
    });

    it('should default to terms aggregation when none provided', () => {
      const result = metadataSchema.safeParse({
        source: 'host.name',
        destination: 'hostName',
      });
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({
        source: 'host.name',
        destination: 'hostName',
        aggregation: { type: 'terms', limit: 1000 },
      });
    });

    it('should parse supported aggregations', () => {
      const result = metadataSchema.safeParse({
        source: 'host.name',
        destination: 'hostName',
        aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
      });
      expect(result.success).toBeTruthy();
    });

    it('should reject unsupported aggregation', () => {
      const result = metadataSchema.safeParse({
        source: 'host.name',
        destination: 'hostName',
        aggregation: { type: 'unknown_agg', limit: 10 },
      });
      expect(result.success).toBeFalsy();
    });
  });

  describe('durationSchema', () => {
    it('should work with 1m', () => {
      const result = durationSchema.safeParse('1m');
      expect(result.success).toBeTruthy();
      expect(result.data).toBe('1m');
    });
    it('should work with 10s', () => {
      const result = durationSchema.safeParse('10s');
      expect(result.success).toBeTruthy();
      expect(result.data).toBe('10s');
    });
    it('should work with 999h', () => {
      const result = durationSchema.safeParse('999h');
      expect(result.success).toBeTruthy();
      expect(result.data).toBe('999h');
    });
    it('should work with 90d', () => {
      const result = durationSchema.safeParse('90d');
      expect(result.success).toBeTruthy();
      expect(result.data).toBe('90d');
    });
    it('should not work with 1ms', () => {
      const result = durationSchema.safeParse('1ms');
      expect(result.success).toBeFalsy();
    });
    it('should not work with invalid values', () => {
      let result = durationSchema.safeParse('PT1H');
      expect(result.success).toBeFalsy();
      result = durationSchema.safeParse('1H');
      expect(result.success).toBeFalsy();
      result = durationSchema.safeParse('1f');
      expect(result.success).toBeFalsy();
      result = durationSchema.safeParse('foo');
      expect(result.success).toBeFalsy();
      result = durationSchema.safeParse(' 1h ');
      expect(result.success).toBeFalsy();
    });
  });

  describe('semVerSchema', () => {
    it('should validate with 999.999.999', () => {
      const result = semVerSchema.safeParse('999.999.999');
      expect(result.success).toBeTruthy();
    });
    it('should not validate with 0.9', () => {
      const result = semVerSchema.safeParse('0.9');
      expect(result.success).toBeFalsy();
      expect(result).toMatchSnapshot();
    });
  });

  describe('historySettingsSchema', () => {
    it('should return default values when not defined', () => {
      let result = historySettingsSchema.safeParse(undefined);
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({ lookbackPeriod: '1h' });

      result = historySettingsSchema.safeParse({ syncDelay: '1m' });
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({ syncDelay: '1m', lookbackPeriod: '1h' });
    });

    it('should return user defined values when defined', () => {
      const result = historySettingsSchema.safeParse({
        lookbackPeriod: '30m',
        syncField: 'event.ingested',
        syncDelay: '5m',
      });
      expect(result.success).toBeTruthy();
      expect(result.data).toEqual({
        lookbackPeriod: '30m',
        syncField: 'event.ingested',
        syncDelay: '5m',
      });
    });
  });
});
