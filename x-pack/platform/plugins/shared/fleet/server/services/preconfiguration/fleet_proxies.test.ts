/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetProxy } from '../../../common/types';

import { hasChanged } from './fleet_proxies';

const baseProxy: FleetProxy = {
  id: 'proxy-1',
  name: 'My Proxy',
  url: 'http://proxy.example.com:3128',
  is_preconfigured: true,
  proxy_headers: null,
  certificate_authorities: null,
  certificate: null,
  certificate_key: null,
};

describe('hasChanged()', () => {
  it('returns false when existing proxy is identical to preconfigured one', () => {
    expect(hasChanged(baseProxy, { ...baseProxy })).toBe(false);
  });

  it('returns true when existing proxy is not preconfigured', () => {
    expect(hasChanged({ ...baseProxy, is_preconfigured: false }, baseProxy)).toBe(true);
  });

  it('returns true when name differs', () => {
    expect(hasChanged(baseProxy, { ...baseProxy, name: 'Other Proxy' })).toBe(true);
  });

  it('returns true when url differs', () => {
    expect(hasChanged(baseProxy, { ...baseProxy, url: 'http://other.example.com:3128' })).toBe(
      true
    );
  });

  describe('proxy_headers', () => {
    it('returns false when both proxy_headers are null', () => {
      expect(
        hasChanged({ ...baseProxy, proxy_headers: null }, { ...baseProxy, proxy_headers: null })
      ).toBe(false);
    });

    it('returns false when proxy_headers are deeply equal', () => {
      const headers = { Authorization: 'Bearer token', 'X-Custom': 1 };
      expect(
        hasChanged(
          { ...baseProxy, proxy_headers: headers },
          { ...baseProxy, proxy_headers: { ...headers } }
        )
      ).toBe(false);
    });

    it('returns true when proxy_headers differ', () => {
      expect(
        hasChanged(
          { ...baseProxy, proxy_headers: { Authorization: 'Bearer old' } },
          { ...baseProxy, proxy_headers: { Authorization: 'Bearer new' } }
        )
      ).toBe(true);
    });

    it('returns true when one proxy_headers is null and other is not', () => {
      expect(
        hasChanged(
          { ...baseProxy, proxy_headers: null },
          { ...baseProxy, proxy_headers: { 'X-Header': 'value' } }
        )
      ).toBe(true);
    });
  });

  describe('certificate_authorities', () => {
    it('returns true when certificate_authorities differs', () => {
      expect(
        hasChanged(
          { ...baseProxy, certificate_authorities: 'old-ca' },
          { ...baseProxy, certificate_authorities: 'new-ca' }
        )
      ).toBe(true);
    });

    it('returns false when undefined and null (normalized equal)', () => {
      expect(
        hasChanged(
          { ...baseProxy, certificate_authorities: undefined },
          { ...baseProxy, certificate_authorities: null }
        )
      ).toBe(false);
    });
  });

  describe('certificate', () => {
    it('returns true when certificate differs', () => {
      expect(
        hasChanged(
          { ...baseProxy, certificate: 'old-cert' },
          { ...baseProxy, certificate: 'new-cert' }
        )
      ).toBe(true);
    });

    it('returns false when undefined and null (normalized equal)', () => {
      expect(
        hasChanged({ ...baseProxy, certificate: undefined }, { ...baseProxy, certificate: null })
      ).toBe(false);
    });
  });

  describe('certificate_key', () => {
    it('returns true when certificate_key differs', () => {
      expect(
        hasChanged(
          { ...baseProxy, certificate_key: 'old-key' },
          { ...baseProxy, certificate_key: 'new-key' }
        )
      ).toBe(true);
    });

    it('returns false when undefined and null (normalized equal)', () => {
      expect(
        hasChanged(
          { ...baseProxy, certificate_key: undefined },
          { ...baseProxy, certificate_key: null }
        )
      ).toBe(false);
    });
  });
});
