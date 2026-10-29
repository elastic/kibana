/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

import {
  PKI_INTERMEDIATE_CA_CERT_PATH,
  PKI_INTERMEDIATE_CLIENT_CERT_PATH,
  PKI_INTERMEDIATE_CLIENT_KEY_PATH,
} from '@kbn/dev-utils';

import type { PkiClientIdentity } from './pki_http2_client';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

const read = (path: string) => readFileSync(path, 'utf8');

/** Issued by an intermediate CA. Kibana and Elasticsearch trust only the root CA above it. */
export const INTERMEDIATE_CLIENT_USERNAME = 'pki_intermediate_client';

/** Sends its leaf certificate followed by the intermediate CA, as a real client would. */
export const INTERMEDIATE_CLIENT: PkiClientIdentity = {
  cert: read(PKI_INTERMEDIATE_CLIENT_CERT_PATH) + read(PKI_INTERMEDIATE_CA_CERT_PATH),
  key: read(PKI_INTERMEDIATE_CLIENT_KEY_PATH),
};

/** Same leaf certificate, without the intermediate CA, so the server can't build a trusted path. */
export const LEAF_ONLY_CLIENT: PkiClientIdentity = {
  cert: read(PKI_INTERMEDIATE_CLIENT_CERT_PATH),
  key: read(PKI_INTERMEDIATE_CLIENT_KEY_PATH),
};
