/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import http2 from 'http2';
import type { IncomingHttpHeaders } from 'http2';

import { CA_CERT_PATH } from '@kbn/dev-utils';

export interface PkiClientIdentity {
  /** PEM leaf certificate, followed by any intermediate CA certificates the client sends. */
  cert: string;
  key: string;
}

export interface PkiHttp2Response {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}

/** HTTP/2 client that presents a PEM client certificate chain over a single TLS connection. */
export class PkiHttp2Client {
  private constructor(private readonly session: http2.ClientHttp2Session) {}

  static async connect(kibanaUrl: string, { cert, key }: PkiClientIdentity) {
    const session = http2.connect(kibanaUrl, { cert, key, ca: readFileSync(CA_CERT_PATH) });
    await new Promise<void>((resolve, reject) => {
      session.once('connect', () => resolve());
      session.once('error', reject);
    });
    return new PkiHttp2Client(session);
  }

  request(path: string, headers: Record<string, string> = {}): Promise<PkiHttp2Response> {
    return new Promise((resolve, reject) => {
      const stream = this.session.request({ ':method': 'GET', ':path': path, ...headers });
      let responseHeaders: IncomingHttpHeaders = {};
      let body = '';

      stream.on('response', (h) => (responseHeaders = h));
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => (body += chunk));
      stream.on('end', () =>
        resolve({ statusCode: Number(responseHeaders[':status']), headers: responseHeaders, body })
      );
      stream.on('error', reject);
      stream.end();
    });
  }

  close() {
    this.session.close();
  }
}
