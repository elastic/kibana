/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SafeParseSuccess } from 'zod';
import { durationSchema, metadataSchema, semVerSchema } from './common';
import moment from 'moment';

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
        limit: 0,
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
        size: 1,
      });
      expect(result.success).toBeTruthy();
      expect(result).toMatchSnapshot();
    });
  });
  describe('durationSchema', () => {
    it('should work with 1m', () => {
      const result = durationSchema.safeParse('1m');
      expect(result.success).toBeTruthy();
      expect((result as SafeParseSuccess<moment.Duration>).data.toJSON()).toBe('1m');
      expect((result as SafeParseSuccess<moment.Duration>).data.asSeconds()).toEqual(60);
    });
    it('should work with 10s', () => {
      const result = durationSchema.safeParse('10s');
      expect(result.success).toBeTruthy();
      expect((result as SafeParseSuccess<moment.Duration>).data.toJSON()).toBe('10s');
      expect((result as SafeParseSuccess<moment.Duration>).data.asSeconds()).toEqual(10);
    });
    it('should work with 999h', () => {
      const result = durationSchema.safeParse('999h');
      expect(result.success).toBeTruthy();
      expect((result as SafeParseSuccess<moment.Duration>).data.toJSON()).toBe('999h');
      expect((result as SafeParseSuccess<moment.Duration>).data.asSeconds()).toEqual(999 * 60 * 60);
    });
    it('should work with 90d', () => {
      const result = durationSchema.safeParse('90d');
      expect(result.success).toBeTruthy();
      expect((result as SafeParseSuccess<moment.Duration>).data.toJSON()).toBe('90d');
      expect((result as SafeParseSuccess<moment.Duration>).data.asSeconds()).toEqual(
        90 * 24 * 60 * 60
      );
    });
    it('should not work with 1ms', () => {
      const result = durationSchema.safeParse('1ms');
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
});
