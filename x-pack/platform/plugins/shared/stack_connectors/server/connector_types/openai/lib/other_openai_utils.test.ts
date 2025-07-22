/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  sanitizeRequest,
  getRequestWithStreamOption,
  pkiSecretsValidator,
  pkiErrorHandler,
  getPKISSLOverrides,
} from './other_openai_utils';
import type { AxiosError } from 'axios';
import type { Secrets } from '../../../../common/openai/types';

describe('Other (OpenAI Compatible Service) Utils', () => {
  describe('sanitizeRequest', () => {
    it('sets stream to false when stream is set to true in the body', () => {
      const body = {
        model: 'mistral',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('sets stream to false when stream is not defined in the body', () => {
      const body = {
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":false}`
      );
    });

    it('sets stream to false when stream is set to false in the body', () => {
      const body = {
        model: 'mistral',
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = sanitizeRequest(JSON.stringify(body));
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      const sanitizedBodyString = sanitizeRequest(bodyString);
      expect(sanitizedBodyString).toEqual(bodyString);
    });
  });

  describe('getRequestWithStreamOption', () => {
    it('sets stream parameter when stream is not defined in the body', () => {
      const body = {
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), true);
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],\"stream\":true}`
      );
    });

    it('overrides stream parameter if defined in body', () => {
      const body = {
        model: 'mistral',
        stream: true,
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), false);
      expect(sanitizedBodyString).toEqual(
        `{\"model\":\"mistral\",\"stream\":false,\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}]}`
      );
    });

    it('does nothing when body is malformed JSON', () => {
      const bodyString = `{\"model\":\"mistral\",\"messages\":[{\"role\":\"user\",\"content\":\"This is a test\"}],,}`;

      const sanitizedBodyString = getRequestWithStreamOption(bodyString, false);
      expect(sanitizedBodyString).toEqual(bodyString);
    });

    it('sets model parameter if specified and not present in the body', () => {
      const body = {
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), true, 'llama-3');
      expect(JSON.parse(sanitizedBodyString)).toEqual({
        messages: [{ content: 'This is a test', role: 'user' }],
        model: 'llama-3',
        stream: true,
      });
    });

    it('does not overrides model parameter if present in the body', () => {
      const body = {
        model: 'mistral',
        messages: [
          {
            role: 'user',
            content: 'This is a test',
          },
        ],
      };

      const sanitizedBodyString = getRequestWithStreamOption(JSON.stringify(body), true, 'llama-3');
      expect(JSON.parse(sanitizedBodyString)).toEqual({
        messages: [{ content: 'This is a test', role: 'user' }],
        model: 'mistral',
        stream: true,
      });
    });
  });
  describe('PKI utils', () => {
    it('pkiErrorHandler returns undefined for unrecognized PKI-related error messages', () => {
      const error = { message: 'Some unknown error occurred' } as AxiosError;
      const result = pkiErrorHandler(error);
      expect(result).toBeUndefined();
    });

    it('returns a friendly message for UNABLE_TO_VERIFY_LEAF_SIGNATURE', () => {
      const error = {
        message: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE: certificate problem',
      } as AxiosError;
      const result = pkiErrorHandler(error);
      expect(result).toMatch(
        /Certificate error: UNABLE_TO_VERIFY_LEAF_SIGNATURE: certificate problem. Please check if your PKI certificates are valid or adjust SSL verification mode./
      );
    });

    it('returns a TLS handshake message for ERR_TLS_CERT_ALTNAME_INVALID', () => {
      const error = {
        message: 'ERR_TLS_CERT_ALTNAME_INVALID: Hostname/IP does not match certificate',
      } as AxiosError;
      const result = pkiErrorHandler(error);
      expect(result).toMatch(
        /TLS handshake failed: ERR_TLS_CERT_ALTNAME_INVALID: Hostname\/IP does not match certificate. Verify server certificate hostname and CA configuration./
      );
    });

    it('returns a TLS handshake message for ERR_TLS_HANDSHAKE', () => {
      const error = { message: 'ERR_TLS_HANDSHAKE: handshake failed' } as AxiosError;
      const result = pkiErrorHandler(error);
      expect(result).toMatch(
        /TLS handshake failed: ERR_TLS_HANDSHAKE: handshake failed. Verify server certificate hostname and CA configuration./
      );
    });

    it('throws an error if certificateData is missing in pkiSecretsValidator', () => {
      const secretsObject = { privateKeyData: 'privateKey' } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'Certificate data must be provided for PKI'
      );
    });

    it('throws an error if privateKeyData is missing in pkiSecretsValidator', () => {
      const secretsObject = { certificateData: 'certificate' } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'Private key data must be provided for PKI'
      );
    });

    it('validates PEM format for privateKeyData in pkiSecretsValidator', () => {
      const secretsObject = {
        certificateData: Buffer.from(
          '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
        ).toString('base64'),
        privateKeyData: 'bad',
      } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'Invalid Private key data file format: The file must be a PEM-encoded private key beginning with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----".'
      );
    });

    it('validates PEM format for certificateData in pkiSecretsValidator', () => {
      const secretsObject = {
        certificateData: 'invalidCertificate',
        privateKeyData: '-----BEGIN PRIVATE KEY-----',
      } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'Invalid Certificate data file format: The file must be a PEM-encoded certificate beginning with "-----BEGIN CERTIFICATE-----".'
      );
    });

    it('validates successfully with valid certificateData and privateKeyData PEM', () => {
      const secretsObject = {
        certificateData: Buffer.from(
          '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
        ).toString('base64'),
        privateKeyData: Buffer.from(
          '-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----'
        ).toString('base64'),
      } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).not.toThrow();
    });

    it('validates successfully with valid certificateData, privateKeyData, and caData PEM', () => {
      const secretsObject = {
        certificateData: Buffer.from(
          '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
        ).toString('base64'),
        privateKeyData: Buffer.from(
          '-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----'
        ).toString('base64'),
        caData: Buffer.from('-----BEGIN CERTIFICATE-----\nca\n-----END CERTIFICATE-----').toString(
          'base64'
        ),
      } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).not.toThrow();
    });

    it('throws an error if caData is not valid PEM in pkiSecretsValidator', () => {
      const secretsObject = {
        certificateData: Buffer.from(
          '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
        ).toString('base64'),
        privateKeyData: Buffer.from(
          '-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----'
        ).toString('base64'),
        caData: Buffer.from('not a valid cert').toString('base64'),
      } as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'Invalid CA certificate data file format: The file must be a PEM-encoded certificate beginning with "-----BEGIN CERTIFICATE-----".'
      );
    });

    it('throws an error if none of the PKI fields are present', () => {
      const secretsObject = {} as Secrets;
      expect(() => pkiSecretsValidator(secretsObject)).toThrow(
        'PKI configuration requires certificate and private key'
      );
    });

    describe('getPKISSLOverrides', () => {
      const logger = { error: jest.fn() } as unknown as Logger;
      const validCert = Buffer.from(
        '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----'
      ).toString('base64');
      const validKey = Buffer.from(
        '-----BEGIN PRIVATE KEY-----\nxyz\n-----END PRIVATE KEY-----'
      ).toString('base64');
      const validCA = Buffer.from(
        '-----BEGIN CERTIFICATE-----\nca\n-----END CERTIFICATE-----'
      ).toString('base64');

      it('returns expected SSLSettings with valid cert, key, and ca', () => {
        const result = getPKISSLOverrides({
          logger,
          certificateData: validCert,
          privateKeyData: validKey,
          caData: validCA,
          verificationMode: 'full',
        });
        expect(result).toMatchObject({
          verificationMode: 'full',
        });
        expect(result.cert).toBeInstanceOf(Buffer);
        expect(result.key).toBeInstanceOf(Buffer);
        expect(result.ca).toBeInstanceOf(Buffer);
      });

      it('returns expected SSLSettings with valid cert and key, ca undefined', () => {
        const result = getPKISSLOverrides({
          logger,
          certificateData: validCert,
          privateKeyData: validKey,
          caData: undefined,
          verificationMode: 'none',
        });
        expect(result.ca).toBeUndefined();
        expect(result.cert).toBeInstanceOf(Buffer);
        expect(result.key).toBeInstanceOf(Buffer);
        expect(result.verificationMode).toBe('none');
      });

      it('throws if cert is invalid', () => {
        expect(() =>
          getPKISSLOverrides({
            logger,
            certificateData: Buffer.from('not a cert').toString('base64'),
            privateKeyData: validKey,
            caData: validCA,
            verificationMode: 'full',
          })
        ).toThrow();
      });

      it('throws if key is invalid', () => {
        expect(() =>
          getPKISSLOverrides({
            logger,
            certificateData: validCert,
            privateKeyData: Buffer.from('not a key').toString('base64'),
            caData: validCA,
            verificationMode: 'full',
          })
        ).toThrow();
      });

      it('throws if ca is invalid', () => {
        expect(() =>
          getPKISSLOverrides({
            logger,
            certificateData: validCert,
            privateKeyData: validKey,
            caData: Buffer.from('not a ca').toString('base64'),
            verificationMode: 'full',
          })
        ).toThrow();
      });
    });
  });
});
