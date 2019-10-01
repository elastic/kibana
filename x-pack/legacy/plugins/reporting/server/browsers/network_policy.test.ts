/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allowResponse } from './network_policy';

describe('Network Policy', () => {
  describe('allows requests', () => {
    describe('for protocols', () => {
      it('when the protocol matches', () => {
        const url = 'https://kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['https:'], [])).toBe(true);
      });

      it('when the protocol is not denied', () => {
        const url = 'https://kibana.com';
        expect(allowResponse(url, '192.168.1.1', [], ['file:'])).toBe(true);
      });

      it('when no protocol is specified', () => {
        const url = 'https://kibana.com';
        expect(allowResponse(url, '192.168.1.1', [], [])).toBe(true);
      });
    });

    describe('for urls', () => {
      it("when they're in the allow-list", () => {
        const url = 'https://kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com'], [])).toBe(true);
      });

      it('when the subdomain is different', () => {
        const url = 'https://www.kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com'], [])).toBe(true);
      });

      it('when subdomain and hostname are exact matches', () => {
        const url = 'https://www.kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['www.kibana.com'], [])).toBe(true);
      });

      it('when sub-domain does not match in the deny-list', () => {
        const url = 'https://www.kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', [], ['https://phishing.kibana.com'])).toBe(true);
      });

      it('when no URLs are specified', () => {
        const url = 'https://kibana.com';
        expect(allowResponse(url, '192.168.1.1', [], [])).toBe(true);
      });
    });

    describe('for ip addresses', () => {
      it('when IP is allowed', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['192.168.1.1'], [])).toBe(true);
      });

      it('when the IP includes wild-cards', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['192.168.*.*'], [])).toBe(true);
      });

      it('when IP is not in the deny-list', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', [], ['255.255.0.0'])).toBe(true);
      });

      it('when IP is not in the deny-list with wild-cards', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', [], ['255.*.*.*'])).toBe(true);
      });
    });

    describe('for complex cases', () => {
      it('allows IPs when multiple are specified', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['192.168.1.1', '182.168.29.29'], [])).toBe(true);
      });

      it('allows protocols when multiple are specified', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['https:', 'http:'], [])).toBe(true);
      });

      it('allows hosts when multiple are specified', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com', 'kibana2.com'], [])).toBe(true);
      });

      it('allows hosts with ports', () => {
        const url = 'https://www.kibana.com:8000/some/route';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com:8000'], [])).toBe(true);
      });
    });
  });

  describe('denies requests', () => {
    describe('for protocols', () => {
      it("when they're in the deny-list", () => {
        const url = 'wss://kibana.com';
        expect(allowResponse(url, '192.168.1.1', [], ['wss:'])).toBe(false);
      });

      it("when they're in both lists", () => {
        const url = 'wss://kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['wss:'], ['wss:'])).toBe(false);
      });

      it('when the allow list is malformed', () => {
        const url = 'https://kibana.com/bad/route';
        expect(allowResponse(url, '192.168.1.1', ['  '], [])).toBe(false);
      });
    });

    describe('for IPs', () => {
      it("when they're in the deny-list", () => {
        const url = 'http://hackes.com';
        expect(allowResponse(url, '192.168.1.1', [], ['192.168.1.1'])).toBe(false);
      });

      it("when they're in both lists", () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['192.168.1.1'], ['192.168.1.1'])).toBe(false);
      });

      it('when the deny list contains wildcards', () => {
        const url = 'https://kibana.com/bad/route';
        expect(allowResponse(url, '192.168.1.1', [], ['192.168.1.*'])).toBe(false);
      });

      it('when the deny list contains complex wildcards', () => {
        const url = 'https://kibana.com/bad/route';
        expect(allowResponse(url, '192.168.1.1', [], ['192.168.*.*'])).toBe(false);
      });

      it('when the protocol is in the deny list', () => {
        const url = 'https://kibana.com/some/route';
        expect(
          allowResponse(url, '192.168.1.1', [], ['https:', 'http:', 'wss:', 'ws:', 'data:'])
        ).toBe(false);
      });
    });

    describe('for URLs', () => {
      it("when they're in the deny-list", () => {
        const url = 'wss://hackes.com';
        expect(allowResponse(url, '192.168.1.1', [], ['hackes.com'])).toBe(false);
      });

      it('when the subdomain does not match', () => {
        const url = 'https://ww2.kibana.com';
        expect(allowResponse(url, '192.168.1.1', ['www.kibana.com'], [])).toBe(false);
      });

      it("when they're in both lists", () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com'], ['kibana.com'])).toBe(false);
      });

      it('when the allow list is malformed', () => {
        const url = 'https://kibana.com/bad/route';
        expect(allowResponse(url, '192.168.1.1', ['  '], [])).toBe(false);
      });
    });

    describe('for complex cases', () => {
      it('denies IPs', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['192.168.1.1'], ['kibana.com'])).toBe(false);
      });

      it('denies hosts', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com'], ['192.168.1.1'])).toBe(false);
      });

      it('denies protocols', () => {
        const url = 'https://kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['https:'], ['kibana.com'])).toBe(false);
      });

      it('when a specific host is denied but a particular route is allowed', () => {
        const url = 'https://www.kibana.com/some/route';
        expect(
          allowResponse(url, '192.168.1.1', ['kibana.com/some/route'], ['www.kibana.com'])
        ).toBe(false);
      });

      it('when a host is denied but a specific host is allowed', () => {
        const url = 'https://www.kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['www.kibana.com'], ['kibana.com'])).toBe(false);
      });

      it('when hosts in allowed list are malformed', () => {
        const url = 'https://www.kibana.com/some/route';
        expect(allowResponse(url, '192.168.1.1', ['kibana.com/some/route'], [])).toBe(false);
      });
    });
  });
});
