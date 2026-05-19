/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSslCertPath } from './ssl_validators';

describe('validateSslCertPath', () => {
  describe('valid inputs (returns undefined)', () => {
    it('empty string', () => {
      expect(validateSslCertPath('')).toBeUndefined();
    });

    it('Linux path without spaces', () => {
      expect(validateSslCertPath('/etc/certs/ca.pem')).toBeUndefined();
    });

    it('relative path without spaces', () => {
      expect(validateSslCertPath('./certs/ca.pem')).toBeUndefined();
    });

    it('Windows absolute path without spaces', () => {
      expect(validateSslCertPath('C:\\certs\\server.pem')).toBeUndefined();
    });

    it('Windows forward-slash path without spaces', () => {
      expect(validateSslCertPath('C:/certs/server.pem')).toBeUndefined();
    });

    it('UNC path without spaces', () => {
      expect(validateSslCertPath('\\\\server\\share\\cert.pem')).toBeUndefined();
    });

    it('PEM certificate content', () => {
      expect(
        validateSslCertPath(
          '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAJC1\n-----END CERTIFICATE-----'
        )
      ).toBeUndefined();
    });

    it('PEM RSA private key', () => {
      expect(
        validateSslCertPath(
          '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----'
        )
      ).toBeUndefined();
    });

    it('PEM EC private key', () => {
      expect(
        validateSslCertPath(
          '-----BEGIN EC PRIVATE KEY-----\nMHQCAQEEIO\n-----END EC PRIVATE KEY-----'
        )
      ).toBeUndefined();
    });

    it('PEM content with leading whitespace', () => {
      expect(
        validateSslCertPath('  -----BEGIN CERTIFICATE-----\nMIID\n-----END CERTIFICATE-----')
      ).toBeUndefined();
    });
  });

  describe('invalid inputs (returns error string)', () => {
    it('Linux path with spaces', () => {
      expect(validateSslCertPath('/path/to my cert.pem')).toBeDefined();
    });

    it('relative path with spaces', () => {
      expect(validateSslCertPath('./my certs/ca.pem')).toBeDefined();
    });

    it('Windows path with spaces', () => {
      expect(validateSslCertPath('C:\\Program Files\\certs\\server.pem')).toBeDefined();
    });

    it('Windows forward-slash path with spaces', () => {
      expect(validateSslCertPath('C:/Program Files/certs/server.pem')).toBeDefined();
    });

    it('UNC path with spaces in share name', () => {
      expect(validateSslCertPath('\\\\server\\my share\\cert.pem')).toBeDefined();
    });

    it('path with tab character', () => {
      expect(validateSslCertPath('/path/to\tcert.pem')).toBeDefined();
    });
  });
});
