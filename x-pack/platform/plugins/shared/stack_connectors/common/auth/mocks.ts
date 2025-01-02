/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PFX_FILE = Buffer.from('a bunch of binary gibberish').toString('base64');
export const CRT_FILE = Buffer.from(
  `
-----BEGIN CERTIFICATE-----
-----END CERTIFICATE-----
`
).toString('base64');

export const KEY_FILE = Buffer.from(
  `
-----BEGIN PRIVATE KEY-----
-----END PRIVATE KEY-----
`
).toString('base64');
