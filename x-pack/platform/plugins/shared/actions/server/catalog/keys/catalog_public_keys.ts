/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Elastic production Ed25519 SPKI PEM key, added before the first publish.
 * Empty until that key exists. The dev keys below are never included here.
 */
export const PRODUCTION_CATALOG_PUBLIC_KEYS: readonly string[] = [];

/**
 * Workflows signing-keys/dev-1.pem and dev-2.pem.
 * Used only when Kibana is running in dev mode.
 */
export const DEV_CATALOG_PUBLIC_KEYS: readonly string[] = [
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAjhgNOzDGWj4wyPZWcR1micu1KFMOzHVQ0rx9FlGFx+4=
-----END PUBLIC KEY-----`,
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAHM3QMaX0G21ycRawNdx0znoJqGuoENaCdO/5fQz1K1E=
-----END PUBLIC KEY-----`,
];

export const getCatalogPublicKeys = (isDev: boolean): readonly string[] => {
  if (isDev) {
    return DEV_CATALOG_PUBLIC_KEYS;
  }
  return PRODUCTION_CATALOG_PUBLIC_KEYS;
};
