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
import { findSessionCookie } from '@kbn/security-api-integration-helpers';

export interface PkiHttp2RequestOptions {
  path: string;
  headers?: Record<string, string>;
}

export interface PkiHttp2Response {
  statusCode: number;
  headers: IncomingHttpHeaders;
  body: string;
}

/** HTTP/2 client that exposes streams so tests can RST after a server-side pre-auth hold parks. */
export class PkiHttp2Client {
  private session: http2.ClientHttp2Session | undefined;

  constructor(private readonly kibanaUrl: string, private readonly pfx: Buffer) {}

  async connect(): Promise<void> {
    const session = http2.connect(this.kibanaUrl, {
      pfx: this.pfx,
      passphrase: '',
      ca: readFileSync(CA_CERT_PATH),
    });

    this.session = await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
      session.once('connect', () => resolve(session));
      session.once('error', reject);
    });
  }

  request({ path, headers = {} }: PkiHttp2RequestOptions): {
    stream: http2.ClientHttp2Stream;
    response: Promise<PkiHttp2Response>;
  } {
    if (!this.session) {
      throw new Error('PkiHttp2Client.connect() must be called before request()');
    }

    const stream = this.session.request({
      ':method': 'GET',
      ':path': path,
      ...headers,
    });
    stream.end();

    let statusCode = 0;
    let responseHeaders: IncomingHttpHeaders = {};
    let body = '';

    const response = new Promise<PkiHttp2Response>((resolve) => {
      stream.on('response', (h) => {
        responseHeaders = h;
        statusCode = Number(h[':status']);
      });
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        body += chunk;
      });
      stream.on('end', () => {
        resolve({ statusCode, headers: responseHeaders, body });
      });
      // RST_STREAM (NGHTTP2_CANCEL) is an expected test signal. A locally cancelled stream
      // emits 'close' without 'end' or 'error', so settle on 'close' as well.
      stream.on('error', () => {
        resolve({ statusCode, headers: responseHeaders, body });
      });
      stream.on('close', () => {
        resolve({ statusCode, headers: responseHeaders, body });
      });
    });

    return { stream, response };
  }

  sidCookieString(headers: IncomingHttpHeaders): string {
    return findSessionCookie(headers['set-cookie']).cookieString();
  }

  close(): void {
    this.session?.close();
    this.session = undefined;
  }
}
