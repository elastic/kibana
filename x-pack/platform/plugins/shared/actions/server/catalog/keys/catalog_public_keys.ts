/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ed25519 SPKI PEM public keys trusted to verify `catalog.json.sig`.
 * Slot 0 is the PoC/dev key. Slot 1 is reserved for the Elastic production key
 * before the first release.
 */
export const CATALOG_PUBLIC_KEYS: readonly string[] = [
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAjhgNOzDGWj4wyPZWcR1micu1KFMOzHVQ0rx9FlGFx+4=
-----END PUBLIC KEY-----`,
  `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAHM3QMaX0G21ycRawNdx0znoJqGuoENaCdO/5fQz1K1E=
-----END PUBLIC KEY-----`,
];
