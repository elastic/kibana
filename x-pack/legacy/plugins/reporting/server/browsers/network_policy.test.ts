/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allowResponse } from './network_policy';

describe('Network Policy', () => {
  describe('allows requests', () => {
    it('when there is no allow or deny list', () => {
      const url = 'https://kibana.com';
      expect(allowResponse(url, [], [])).toBe(true);
    });

    it("when they're in the allow-list", () => {
      const url = 'https://kibana.com';
      expect(allowResponse(url, ['https://kibana.com'], [])).toBe(true);
    });

    it("when they're not in the deny-list", () => {
      const url = 'https://kibana.com';
      expect(allowResponse(url, [], ['file://'])).toBe(true);
    });

    it('when no host is specified', () => {
      const url = 'https://kibana.com';
      expect(allowResponse(url, ['https://'], [])).toBe(true);
    });

    it('when sub-domain does not match', () => {
      const url = 'https://www.kibana.com/some/route';
      expect(allowResponse(url, [], ['https://kibana.com'])).toBe(true);
    });

    it('when a specific host is denied but a particular route is allowed', () => {
      const url = 'https://kibana.com/some/route';
      expect(allowResponse(url, ['https://kibana.com/some/route'], ['https://kibana.com'])).toBe(
        true
      );
    });

    it('when the protocol is allowed', () => {
      const url = 'https://kibana.com/some/route';
      expect(allowResponse(url, ['https:', 'http:', 'wss:', 'ws:', 'data:'], [])).toBe(true);
    });
  });

  describe('denies requests', () => {
    it("when they're in the deny-list", () => {
      const url = 'wss://hackes.com';
      expect(allowResponse(url, [], ['wss://hackes.com'])).toBe(false);
    });

    it("when they're in both lists", () => {
      const url = 'https://kibana.com/some/route';
      expect(allowResponse(url, ['https://kibana.com'], ['https://kibana.com'])).toBe(false);
    });

    it('when the allow list is malformed', () => {
      const url = 'https://kibana.com/bad/route';
      expect(allowResponse(url, ['  '], [])).toBe(false);
    });

    it('when the protocol is in the deny list', () => {
      const url = 'https://kibana.com/some/route';
      expect(allowResponse(url, [], ['https:', 'http:', 'wss:', 'ws:', 'data:'])).toBe(false);
    });
  });
});
