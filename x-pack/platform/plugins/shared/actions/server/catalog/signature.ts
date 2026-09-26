/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sign, verify } from 'crypto';

export class CatalogSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogSignatureError';
  }
}

/** Verifies a detached Ed25519 signature over the exact catalog.json bytes. */
export const verifyCatalogSignature = (
  bytes: string,
  signatureBase64: string,
  publicKeys: readonly string[]
): boolean => {
  let signature: Buffer;
  try {
    signature = Buffer.from(signatureBase64, 'base64');
  } catch {
    return false;
  }
  if (signature.length === 0) {
    return false;
  }
  const payload = Buffer.from(bytes, 'utf8');
  return publicKeys.some((publicKey) => {
    try {
      return verify(null, payload, publicKey, signature);
    } catch {
      return false;
    }
  });
};

/** Signs catalog.json bytes with an Ed25519 PKCS8 private key. Tests and fixture scripts only. */
export const signCatalogForTests = (bytes: string, privateKeyPem: string): string =>
  sign(null, Buffer.from(bytes, 'utf8'), privateKeyPem).toString('base64');
