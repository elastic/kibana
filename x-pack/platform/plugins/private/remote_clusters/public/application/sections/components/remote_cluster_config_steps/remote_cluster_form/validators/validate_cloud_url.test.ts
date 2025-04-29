/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_MODEL } from '../../../../../../../common/constants';
import {
  isCloudAdvancedOptionsEnabled,
  validateCloudRemoteAddress,
  convertCloudRemoteAddressToProxyConnection,
  i18nTexts,
} from './validate_cloud_url';

describe('Cloud remote address', () => {
  describe('validation', () => {
    it('errors when the url is empty', () => {
      const actual = validateCloudRemoteAddress('');
      expect(actual).toBe(i18nTexts.urlEmpty);
    });

    it('errors when the url is invalid', () => {
      const actual = validateCloudRemoteAddress('invalid%url');
      expect(actual).toBe(i18nTexts.urlInvalid);
    });
  });

  describe('is advanced options toggle enabled', () => {
    it('false for a new cluster', () => {
      const actual = isCloudAdvancedOptionsEnabled();
      expect(actual).toBe(false);
    });

    it('false when proxy address is empty', () => {
      const actual = isCloudAdvancedOptionsEnabled({
        name: 'test',
        proxyAddress: '',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
      expect(actual).toBe(false);
    });

    it('false when proxy address is the same as server name', () => {
      const actual = isCloudAdvancedOptionsEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:9400',
        serverName: 'some-proxy',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
      expect(actual).toBe(false);
    });
    it('true when proxy address is not the same as server name', () => {
      const actual = isCloudAdvancedOptionsEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:9400',
        serverName: 'some-server-name',
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
      expect(actual).toBe(true);
    });
    it('true when socket connections is not the default value', () => {
      const actual = isCloudAdvancedOptionsEnabled({
        name: 'test',
        proxyAddress: 'some-proxy:9400',
        serverName: 'some-proxy-name',
        proxySocketConnections: 19,
        securityModel: SECURITY_MODEL.CERTIFICATE,
      });
      expect(actual).toBe(true);
    });
  });
  describe('conversion from cloud remote address', () => {
    it('empty url to empty proxy connection values', () => {
      const actual = convertCloudRemoteAddressToProxyConnection('');
      expect(actual).toEqual({ proxyAddress: '', serverName: '' });
    });

    it('url with protocol and port to proxy connection values', () => {
      const actual = convertCloudRemoteAddressToProxyConnection('http://test.com:1234');
      expect(actual).toEqual({ proxyAddress: 'test.com:1234', serverName: 'test.com' });
    });

    it('url with protocol and no port to proxy connection values', () => {
      const actual = convertCloudRemoteAddressToProxyConnection('http://test.com');
      expect(actual).toEqual({ proxyAddress: 'test.com:9400', serverName: 'test.com' });
    });

    it('url with no protocol to proxy connection values', () => {
      const actual = convertCloudRemoteAddressToProxyConnection('test.com');
      expect(actual).toEqual({ proxyAddress: 'test.com:9400', serverName: 'test.com' });
    });

    it('invalid url to empty proxy connection values', () => {
      const actual = convertCloudRemoteAddressToProxyConnection('invalid%url');
      expect(actual).toEqual({ proxyAddress: '', serverName: '' });
    });
  });
});
