/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allowRequest } from './network_policy';

describe('Network Policy', () => {
  describe('base cases', () => {
    it('allows requests when there are no rules', () => {
      const request = {
        url: 'https://kibana.com',
        ip: null,
      };

      expect(allowRequest(request, [])).toBe(true);
    });

    it('allows requests when no rules match', () => {
      const request = {
        url: 'http://www.kibana.com',
        ip: null,
      };

      const rules = [
        { allow: false, hosts: ['west.kibana.com'], protocols: ['https:'] },
        { allow: false, hosts: ['east.kibana.com'], protocols: ['https:'] },
      ];

      expect(allowRequest(request, rules)).toBe(true);
    });
  });

  describe('protocols', () => {
    it('allows requests when they are whitelisted', () => {
      const request = {
        url: 'https://kibana.com',
        ip: null,
      };

      const rules = [{ allow: true, protocols: ['https:'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('allows requests when they are not blacklisted', () => {
      const request = {
        url: 'https://kibana.com',
        ip: null,
      };

      const rules = [{ allow: false, protocols: ['http:'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('rejects requests when they are not whitelisted', () => {
      const request = {
        url: 'http://kibana.com',
        ip: null,
      };

      const rules = [{ allow: true, protocols: ['https:'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });

    it('rejects requests when they are blacklisted', () => {
      const request = {
        url: 'http://kibana.com',
        ip: null,
      };

      const rules = [{ allow: false, protocols: ['http:'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });
  });

  describe('hosts', () => {
    it('allows requests by whitelist', () => {
      const request = {
        url: 'http://kibana.com',
        ip: null,
      };

      const rules = [{ allow: true, hosts: ['kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('allows requests when subdomains are not specific', () => {
      const request = {
        url: 'http://www.kibana.com',
        ip: null,
      };

      const rules = [{ allow: true, hosts: ['kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('rejects requests when subdomains are not specific', () => {
      const request = {
        url: 'http://east.kibana.com',
        ip: null,
      };

      const rules = [{ allow: true, hosts: ['www.kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });

    it('allows requests when subdomains are not specific and not blacklisted', () => {
      const request = {
        url: 'http://east.kibana.com',
        ip: null,
      };

      const rules = [{ allow: false, hosts: ['www.kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('allows requests when subdomains are not blacklisted', () => {
      const request = {
        url: 'http://west.kibana.com',
        ip: null,
      };

      const rules = [{ allow: false, hosts: ['www.kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('rejects requests by blacklist', () => {
      const request = {
        url: 'http://something-bad.com',
        ip: null,
      };

      const rules = [{ allow: false, hosts: ['something-bad.com'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });

    it('rejects requests when not in the whitelist', () => {
      const request = {
        url: 'http://something-bad.com',
        ip: '192.168.1.1',
      };

      const rules = [{ allow: true, hosts: ['kibana.com'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });

    it('allows requests when not in the blacklist', () => {
      const request = {
        url: 'http://kibana.com',
        ip: '192.168.1.1',
      };

      const rules = [{ allow: false, hosts: ['something-bad.com'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });
  });

  describe('IPs', () => {
    it('allows requests when IP is not known with whitelists', () => {
      const request = {
        url: 'http://something-good.com',
        ip: null,
      };

      const rules = [{ allow: true, ips: ['192.168.1.1'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('allows requests when IP is not known with blacklists', () => {
      const request = {
        url: 'http://something-good.com',
        ip: null,
      };

      const rules = [{ allow: false, ips: ['192.168.1.1'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('allows requests via whitelist', () => {
      const request = {
        url: 'http://something-good.com',
        ip: '192.168.1.1',
      };

      const rules = [{ allow: true, ips: ['192.168.1.1'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('rejects requests via blacklist', () => {
      const request = {
        url: 'http://something-bad.com',
        ip: '192.168.2.1',
      };

      const rules = [{ allow: false, ips: ['192.168.2.1'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });

    it('allows when not blacklisted', () => {
      const request = {
        url: 'http://something-good.com',
        ip: '192.168.2.1',
      };

      const rules = [{ allow: false, ips: ['192.168.1.1'] }];

      expect(allowRequest(request, rules)).toBe(true);
    });

    it('rejects requests when not whitelisted', () => {
      const request = {
        url: 'http://something-bad.com',
        ip: '192.168.2.1',
      };

      const rules = [{ allow: true, ips: ['192.168.1.1'] }];

      expect(allowRequest(request, rules)).toBe(false);
    });
  });

  describe('complex cases', () => {
    it('allows https traffic except to something forbidden', () => {
      const rules = [
        { allow: false, hosts: ['something-forbidden'] },
        { allow: true, protocols: ['https:'] },
      ];

      expect(allowRequest({ url: 'https://kibana.com', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'https://something-forbidden/', ip: '192.168.1.1' }, rules)).toBe(
        false
      );
      expect(
        allowRequest(
          { url: 'https://something-forbidden/some-file.html', ip: '192.168.1.1' },
          rules
        )
      ).toBe(false);
    });

    it('allows http traffic only to a specific host', () => {
      const rules = [
        { allow: true, hosts: ['something-acceptable'] },
        { allow: false, protocols: ['http:'] },
      ];

      expect(allowRequest({ url: 'http://kibana.com', ip: '192.168.1.1' }, rules)).toBe(false);
      expect(allowRequest({ url: 'http://something-acceptable/', ip: '192.168.1.1' }, rules)).toBe(
        true
      );
      expect(
        allowRequest(
          { url: 'http://something-acceptable/some-file.html', ip: '192.168.1.1' },
          rules
        )
      ).toBe(true);
    });

    it('allows http traffic from only one IP', () => {
      const rules = [{ allow: true, ips: ['192.168.1.1'] }, { allow: true, protocols: ['https:'] }];

      expect(allowRequest({ url: 'http://kibana.com', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'https://something-forbidden/', ip: '192.168.2.1' }, rules)).toBe(
        false
      );
      expect(
        allowRequest({ url: 'http://something-forbidden/some-file.html', ip: null }, rules)
      ).toBe(true);
    });

    it('allows traffic only from localhost', () => {
      const rules = [{ allow: true, hosts: ['localhosts:3000'] }];

      expect(allowRequest({ url: 'http://kibana.com', ip: '192.168.1.1' }, rules)).toBe(false);
      expect(allowRequest({ url: 'http://localhosts:3000/some-file.html', ip: null }, rules)).toBe(
        true
      );
    });

    it('allows traffic from multiple hosts', () => {
      const rules = [{ allow: true, hosts: ['maps.elastic.com', 'localhost:3000'] }];

      expect(allowRequest({ url: 'http://maps.elastic.com', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost:3000/some-file.html', ip: null }, rules)).toBe(
        true
      );
    });

    it('allows traffic from multiple protocols', () => {
      const rules = [{ allow: true, protocols: ['https:', 'http:'] }];

      expect(allowRequest({ url: 'https://localhost', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: null }, rules)).toBe(true);
      expect(allowRequest({ url: 'wss://localhost', ip: null }, rules)).toBe(false);
    });

    it('allows traffic from multiple IPs when provided', () => {
      const rules = [{ allow: true, ips: ['192.168.1.1', '192.168.2.1'] }];

      expect(allowRequest({ url: 'https://localhost', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: '192.168.2.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: null }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: '192.166.1.1' }, rules)).toBe(false);
    });

    it('allows traffic under a variety of conditions', () => {
      const rules = [
        { allow: true, hosts: ['kibana.com', 'elastic.com'], ips: ['192.168.1.1', '192.168.2.1'] },
      ];

      expect(allowRequest({ url: 'https://kibana.com', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://elastic.com', ip: '192.168.2.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'https://kibana.com', ip: null }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://elastic.com', ip: null }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: null }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://localhost', ip: '192.166.1.1' }, rules)).toBe(false);
    });

    it('can OR between conditions', () => {
      const rules = [{ allow: true, hosts: ['kibana.com'], ips: ['192.168.1.1'] }];

      expect(allowRequest({ url: 'https://kibana.com', ip: '192.168.1.1' }, rules)).toBe(true);
      expect(allowRequest({ url: 'http://elastic.com', ip: '192.168.2.1' }, rules)).toBe(false);
    });

    it('rejects traffic under a variety of conditions', () => {
      const rules = [
        { allow: false, hosts: ['bad.com', 'phish.com'], ips: ['192.168.1.1', '192.168.2.1'] },
      ];

      expect(allowRequest({ url: 'https://bad.com', ip: '192.168.1.1' }, rules)).toBe(false);
      expect(allowRequest({ url: 'http://phish.com', ip: '192.168.2.1' }, rules)).toBe(false);
      expect(allowRequest({ url: 'https://bad.com', ip: null }, rules)).toBe(false);
      expect(allowRequest({ url: 'http://phish.com', ip: null }, rules)).toBe(false);
    });
  });
});
