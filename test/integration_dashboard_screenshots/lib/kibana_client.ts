/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import http from 'http';
import https from 'https';

interface ClientOptions {
  baseUrl: string;
  username: string;
  password: string;
}

const agent = new https.Agent({ rejectUnauthorized: false });

const resolveUrl = (baseUrl: string, apiPath: string): URL => {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = apiPath.startsWith('/') ? apiPath.slice(1) : apiPath;
  return new URL(normalizedPath, normalizedBase);
};

const request = async (
  baseUrl: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; body: any }> => {
  const url = resolveUrl(baseUrl, path);
  const isHttps = url.protocol === 'https:';
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(isHttps ? { agent } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
          resolve({ status: res.statusCode ?? 0, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

export const createKibanaClient = ({ baseUrl, username, password }: ClientOptions) => {
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
    'kbn-xsrf': 'true',
    'elastic-api-version': '2023-10-31',
  };

  return {
    get: (path: string) => request(baseUrl, 'GET', path, headers),
    post: (path: string, body?: unknown) => request(baseUrl, 'POST', path, headers, body),
    delete: (path: string) => request(baseUrl, 'DELETE', path, headers),
  };
};

export const createEsClient = ({ baseUrl, username, password }: ClientOptions) => {
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const headers: Record<string, string> = {
    Authorization: `Basic ${auth}`,
  };

  return {
    get: (path: string) => request(baseUrl, 'GET', path, headers),
    post: (path: string, body?: unknown) => request(baseUrl, 'POST', path, headers, body),
    put: (path: string, body?: unknown) => request(baseUrl, 'PUT', path, headers, body),
    delete: (path: string) => request(baseUrl, 'DELETE', path, headers),
    deleteDataStream: async (name: string) => {
      const res = await request(baseUrl, 'DELETE', `/_data_stream/${name}`, headers);
      if (res.status === 200) {
        console.log(`  Cleared existing data stream: ${name}`);
      }
    },
    bulk: async (path: string, ndjson: string): Promise<{ status: number; body: any }> => {
      const url = resolveUrl(baseUrl, path);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      return new Promise((resolve, reject) => {
        const req = lib.request(
          url,
          {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/x-ndjson',
            },
            ...(isHttps ? { agent } : {}),
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              const text = Buffer.concat(chunks).toString();
              let parsed: any;
              try {
                parsed = JSON.parse(text);
              } catch {
                parsed = text;
              }
              resolve({ status: res.statusCode ?? 0, body: parsed });
            });
          }
        );
        req.on('error', reject);
        req.write(ndjson);
        req.end();
      });
    },
  };
};

export type KibanaClient = ReturnType<typeof createKibanaClient>;
export type EsClient = ReturnType<typeof createEsClient>;
