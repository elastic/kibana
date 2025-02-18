/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineHeadersWithBasicAuthHeader, getBasicAuthHeader } from './get_basic_auth_header';

describe('get_basic_auth_header', () => {
  describe('getBasicAuthHeader', () => {
    it('constructs the basic auth header correctly', () => {
      expect(getBasicAuthHeader({ username: 'test', password: 'foo' })).toEqual({
        Authorization: `Basic ${Buffer.from('test:foo').toString('base64')}`,
      });
    });
  });

  describe('combineHeadersWithBasicAuthHeader', () => {
    it('constructs the basic auth header correctly', () => {
      expect(combineHeadersWithBasicAuthHeader({ username: 'test', password: 'foo' })).toEqual({
        Authorization: `Basic ${Buffer.from('test:foo').toString('base64')}`,
      });
    });

    it('adds extra headers correctly', () => {
      expect(
        combineHeadersWithBasicAuthHeader({
          username: 'test',
          password: 'foo',
          headers: { 'X-token': 'foo' },
        })
      ).toEqual({
        Authorization: `Basic ${Buffer.from('test:foo').toString('base64')}`,
        'X-token': 'foo',
      });
    });

    it('does not overrides the auth header if provided', () => {
      expect(
        combineHeadersWithBasicAuthHeader({
          username: 'test',
          password: 'foo',
          headers: { Authorization: 'Bearer my_token' },
        })
      ).toEqual({
        Authorization: 'Bearer my_token',
      });
    });

    it('returns only the headers if auth is undefined', () => {
      expect(
        combineHeadersWithBasicAuthHeader({
          headers: { 'X-token': 'foo' },
        })
      ).toEqual({
        'X-token': 'foo',
      });
    });

    it('returns undefined with no arguments', () => {
      expect(combineHeadersWithBasicAuthHeader()).toEqual(undefined);
    });

    it('returns undefined when headers are null', () => {
      expect(combineHeadersWithBasicAuthHeader({ headers: null })).toEqual(undefined);
    });
  });
});
