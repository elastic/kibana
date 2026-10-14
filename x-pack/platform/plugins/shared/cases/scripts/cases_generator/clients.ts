/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import type { KbnClientOptions } from '@kbn/test';
import fs from 'fs';
import { logger } from './logger';
import type { KbnContext } from './types';
import { updateURL } from './utils';

// Builds the KbnClient + auth headers used for every Kibana HTTP request in
// this script. Embeds basic-auth credentials in the URL, layers in TLS+CA when
// --ssl is set, and adds an `Authorization: ApiKey ...` header when --apiKey
// is provided. Called once at the start of runGenerator.
export function createKbnClient({
  url,
  username,
  password,
  ssl,
  apiKey,
}: {
  url: string;
  username: string;
  password: string;
  ssl: boolean;
  apiKey?: string;
}): KbnContext {
  let updatedUrl = updateURL({ url, user: { username, password } });

  let kbnClientOptions: KbnClientOptions = { log: logger, url: updatedUrl };

  if (ssl) {
    const ca = fs.readFileSync(CA_CERT_PATH);
    updatedUrl = updateURL({ url: updatedUrl, user: { username, password }, protocol: 'https:' });
    kbnClientOptions = { ...kbnClientOptions, certificateAuthorities: [ca], url: updatedUrl };
  }

  const kbnClient = new KbnClient(kbnClientOptions);
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  }

  return { kbnClient, headers };
}

// Builds the Elasticsearch client used for bulk-indexing alerts and events.
// Created lazily by runGenerator only when --alerts > 0 or --events > 0;
// upgrades the node URL to https and adds the dev CA when --ssl is set.
export function createEsClient({
  node,
  ssl,
  username,
  password,
}: {
  node: string;
  ssl: boolean;
  username: string;
  password: string;
}): Client {
  let clientOptions: ClientOptions = {
    Connection: HttpConnection,
    node,
    auth: { username, password },
    requestTimeout: 60_000,
  };

  if (ssl) {
    const ca = fs.readFileSync(CA_CERT_PATH);
    const httpsNode = updateURL({ url: node, protocol: 'https:' });
    clientOptions = { ...clientOptions, node: httpsNode, tls: { ca: [ca] } };
  }

  return new Client(clientOptions);
}
