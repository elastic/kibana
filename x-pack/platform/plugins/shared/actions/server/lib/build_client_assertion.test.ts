/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants, createVerify } from 'crypto';
import {
  buildClientAssertion,
  computeCertificateThumbprint,
  CLIENT_ASSERTION_TYPE,
} from './build_client_assertion';

// Self-signed test certificate and key (RSA 2048-bit, CN=test)
const TEST_CERT = `-----BEGIN CERTIFICATE-----
MIIC/zCCAeegAwIBAgIUXDjOtk518wK8UMh3UZ0TzOVQMJcwDQYJKoZIhvcNAQEL
BQAwDzENMAsGA1UEAwwEdGVzdDAeFw0yNjAzMDYxNDExNDlaFw0yNzAzMDYxNDEx
NDlaMA8xDTALBgNVBAMMBHRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQD0IgH+KiWrLrw++u5Pgn3kROoHdrdqY3hLOgr26llOXPCaS+M5HvaTCG7x
t9aJYcQtw4Cefum+tAmv4zJFPjH0zi6fwItmOMmA/WoRgk6yMJMFOF4k63IWb4hA
Bm6SxFPwDC9BDK+9EE/6rjWwQZNizwwHX7nnkUeDJp9FfiBKX0WRziYy3VXGF+Dx
5vrZlZ6dbSQr6Z1hOGz3wx3zsirFUo/eHgUVHNctAVE2klTm/BGlb/x88ZKfvlyh
UyRyyflD4jsIO2PkXxoshU3wIbxsEiZOtxyvIosyzwHKNrf9OKkM2F/Hyd3o+DZ1
f5ZA7y3lL9ktqJui8e568sDz9QznAgMBAAGjUzBRMB0GA1UdDgQWBBTweyTbIGqp
MyS3LPR+wsp4VPNH0TAfBgNVHSMEGDAWgBTweyTbIGqpMyS3LPR+wsp4VPNH0TAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCn8FrOhnXaTdSrUAk0
9b7CGsvxMB07uL238Ih4rEuAHAA235QdtY9xB+/J125b5jnvtCvYbqtTJ94XlPXt
ZgcdnN7SQATGcLB3qulS5kBEFCPMDioYuggngNIlQU0CULPUXKYQC4Rm3NNVTQ4e
jD9GN/DzeKR+PhPZ9K5o30Z6XN4Pe32F3qzY8EmLss0blvj03o232b8TslQ8Yeg+
eLnSp0Q/zm5kJlKWXlRUi+pO2CGQVis71EDwPwyZ5RTqblnj0U17HP7uz9XJXD9i
BH8GvW4UbV5LTmv+MRe+LvcwjLQ8qJqttA+cUWg2OK8H+RJUxvmpYrI1Eytd2pWV
rrMW
-----END CERTIFICATE-----`;

const TEST_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD0IgH+KiWrLrw+
+u5Pgn3kROoHdrdqY3hLOgr26llOXPCaS+M5HvaTCG7xt9aJYcQtw4Cefum+tAmv
4zJFPjH0zi6fwItmOMmA/WoRgk6yMJMFOF4k63IWb4hABm6SxFPwDC9BDK+9EE/6
rjWwQZNizwwHX7nnkUeDJp9FfiBKX0WRziYy3VXGF+Dx5vrZlZ6dbSQr6Z1hOGz3
wx3zsirFUo/eHgUVHNctAVE2klTm/BGlb/x88ZKfvlyhUyRyyflD4jsIO2PkXxos
hU3wIbxsEiZOtxyvIosyzwHKNrf9OKkM2F/Hyd3o+DZ1f5ZA7y3lL9ktqJui8e56
8sDz9QznAgMBAAECggEABH0flkHGIYihc3L/sLyQfgL6XprDMpSToKZ3jySt8a/p
yJx+mA1GsVtlVtJvgmUmy0Sd98wTlisPRomh4f4LwxmLZ+qNZZrDsbh3G81Ojx4v
hdgMexdNKLZyReMYY2ByvqYqtEJ8dLh5D/3mBNCf2iA+c2BCNczJCNNL+GYiR9vB
ZSlBCKMXB3YWt+7rHLHdWWRpHlKzBr5LycPOA7VpPaIaJD7RBodk57yMrdCOrtZO
reHyTg7UeABVntO5gPAQQ6l+XDm9lYqBVonPRstwv62EX1yNAqp22R3Q7N0LaqjZ
6X2sEsqcATftcGiEzQA8IWZea7Yn633bqjRnzRh8aQKBgQD78zzMLy80nuhE9nWu
KdiB8NXWHXJf48cov7W38cFeNTFjXLH1Qh1UPiYUJzVGCr03hVsQbr97dYC0d4dm
DxhTi1DlQX7dAW947oY05y4NSUmLGqPZWbffOzHKImjVk4Zk0pNCIoqqL3Gl3mLF
G1JIpqdKYc2XWXW8yQWtzHKSiwKBgQD4Dpo7qE0ckxWnBlrFOgwiJKzdumACVdvN
co/jdJJ7nGD0xTO0nE9MuyKIZteI7yfMRp1GIey4cvCeWzkVkJzI1Uy1pmxDDkGp
F+/XQpXhCTu+EhmOtOrhl98RRTwV419KUOC4a/QJ6LQZ+Q9jac0X4m/zsS1P/lNe
7uI9HNOGlQKBgHaUk6/SIViV1eHnUZnIDiOSM0KUF2m0Ld8q458QhJ8PUBBg50z0
chNdMNTZY0R093tzI1oHlc3IjuvhOfO59QwVDNzpx4jDDTEQqk+p4s3UCW4T+rvo
cxb4qEVnjom+5kj7pt1AnpzcuZOEqF32rvKMpT3n7DhonXZd8nNLPz1jAoGBANL7
qJdhWOUa/Wmo7/+clcFcrGOTKCIUYPXnoRb3ibf1lEnciVPvN0uuR3r47g4cTB9l
WFPUewGPUbV/JZh//bqcIbjHKoIGWDa4k1jl25EiR1wtDOviWX0zrZmE58w+LkiJ
bfmuaE0dTkJhIoON89GC2XHOmxnU2Zh/WpJcOFXZAoGAe9bC1fjFTaRY1ayYGLrB
1rBejheHOD7jrnD2f6jBs2ZnWw6vM7TAiTVu3qkHRXE0CgJzo+0EMhdzN0mRiG4z
ZnjybYsLOa0bcyPjPSSAgTJIktx31zU2i4hYguMrSjKM707l/wgc5tGYntxG73ko
XdrjUG57ieFN1nGLViofieM=
-----END PRIVATE KEY-----`;

const TOKEN_URL = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token';
const CLIENT_ID = 'test-client-id';

describe('buildClientAssertion', () => {
  describe('CLIENT_ASSERTION_TYPE', () => {
    it('should be the JWT bearer assertion type', () => {
      expect(CLIENT_ASSERTION_TYPE).toBe('urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    });
  });

  describe('computeCertificateThumbprint', () => {
    it('should compute a base64url-encoded SHA-256 thumbprint from a PEM certificate', () => {
      const thumbprint = computeCertificateThumbprint(TEST_CERT);

      expect(thumbprint).toBeTruthy();
      expect(thumbprint).not.toContain('+');
      expect(thumbprint).not.toContain('/');
      expect(thumbprint).not.toContain('=');
      // SHA-256 digest is 32 bytes; base64url of 32 bytes is 43 chars
      expect(thumbprint.length).toBe(43);
    });

    it('should produce a deterministic thumbprint', () => {
      const t1 = computeCertificateThumbprint(TEST_CERT);
      const t2 = computeCertificateThumbprint(TEST_CERT);
      expect(t1).toBe(t2);
    });

    it('should throw on invalid PEM data', () => {
      expect(() => computeCertificateThumbprint('not a certificate')).toThrow(
        'Invalid PEM certificate'
      );
    });

    it('should handle PEM with extra whitespace', () => {
      const certWithExtraWhitespace = TEST_CERT.replace(
        '-----BEGIN CERTIFICATE-----',
        '-----BEGIN CERTIFICATE-----\n\n'
      );
      const t1 = computeCertificateThumbprint(TEST_CERT);
      const t2 = computeCertificateThumbprint(certWithExtraWhitespace);
      expect(t1).toBe(t2);
    });
  });

  describe('buildClientAssertion', () => {
    it('should produce a three-part JWT string', () => {
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });

      const parts = jwt.split('.');
      expect(parts).toHaveLength(3);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should have correct JWT header fields with x5t#S256', () => {
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });

      const [headerB64] = jwt.split('.');
      const padded = headerB64.replace(/-/g, '+').replace(/_/g, '/');
      const header = JSON.parse(Buffer.from(padded, 'base64').toString());

      expect(header.alg).toBe('PS256');
      expect(header.typ).toBe('JWT');
      expect(header['x5t#S256']).toBeTruthy();
      expect(header['x5t#S256']).toBe(computeCertificateThumbprint(TEST_CERT));
    });

    it('should have correct JWT payload claims', () => {
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });

      const [, payloadB64] = jwt.split('.');
      const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(padded, 'base64').toString());

      expect(payload.aud).toBe(TOKEN_URL);
      expect(payload.iss).toBe(CLIENT_ID);
      expect(payload.sub).toBe(CLIENT_ID);
      expect(payload.jti).toBeTruthy();
      expect(typeof payload.iat).toBe('number');
      expect(typeof payload.nbf).toBe('number');
      expect(typeof payload.exp).toBe('number');
      expect(payload.iat).toBe(payload.nbf);
      expect(payload.exp - payload.nbf).toBe(600);
    });

    it('should produce a valid PS256 (RSA-PSS + SHA-256) signature', () => {
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });

      const [headerB64, payloadB64, signatureB64] = jwt.split('.');
      const signingInput = `${headerB64}.${payloadB64}`;
      const signaturePadded = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      const signature = Buffer.from(signaturePadded, 'base64');

      const isValid = createVerify('sha256')
        .update(signingInput)
        .verify(
          {
            key: TEST_CERT,
            padding: constants.RSA_PKCS1_PSS_PADDING,
            saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
          },
          signature
        );
      expect(isValid).toBe(true);
    });

    it('should handle a private key with newlines stripped (storage round-trip)', () => {
      const singleLineKey = TEST_KEY.replace(/\n/g, '');
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: singleLineKey,
      });

      const [headerB64, payloadB64, signatureB64] = jwt.split('.');
      const signingInput = `${headerB64}.${payloadB64}`;
      const signaturePadded = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
      const signature = Buffer.from(signaturePadded, 'base64');

      const isValid = createVerify('sha256')
        .update(signingInput)
        .verify(
          {
            key: TEST_CERT,
            padding: constants.RSA_PKCS1_PSS_PADDING,
            saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
          },
          signature
        );
      expect(isValid).toBe(true);
    });

    it('should handle a private key with mixed whitespace', () => {
      const messyKey = TEST_KEY.replace(/\n/g, ' ');
      const jwt = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: messyKey,
      });

      expect(jwt.split('.')).toHaveLength(3);
    });

    it('should throw on an invalid private key', () => {
      expect(() =>
        buildClientAssertion({
          tokenUrl: TOKEN_URL,
          clientId: CLIENT_ID,
          certificate: TEST_CERT,
          privateKey: 'not-a-key',
        })
      ).toThrow('Invalid PEM');
    });

    it('should generate unique jti for each assertion', () => {
      const jwt1 = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });
      const jwt2 = buildClientAssertion({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: TEST_CERT,
        privateKey: TEST_KEY,
      });

      const decode = (b64: string) => {
        const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(padded, 'base64').toString());
      };

      const payload1 = decode(jwt1.split('.')[1]);
      const payload2 = decode(jwt2.split('.')[1]);
      expect(payload1.jti).not.toBe(payload2.jti);
    });
  });
});
