/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metadataSchema } from './common';

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
});
