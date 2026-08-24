/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 8090);

const sendJson = (response, status, body, headers = {}) => {
  const encoded = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(encoded),
    ...headers,
  });
  response.end(encoded);
};

const requireCredential = (request, response) => {
  if (request.headers.key || request.headers.authorization?.startsWith('SSWS ')) return true;
  sendJson(response, 401, { error: 'Supply any API key or SSWS token for the local PoC.' });
  return false;
};

const buildNextLink = (requestUrl, nextPage) => {
  if (!nextPage) return undefined;
  const nextUrl = new URL(requestUrl);
  nextUrl.searchParams.set('after', nextPage);
  return `<${nextUrl.toString()}>; rel="next"`;
};

createServer(async (request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (requestUrl.pathname === '/_health') {
    sendJson(response, 200, { ok: true });
    return;
  }
  if (!requireCredential(request, response)) return;

  if (request.method === 'GET' && requestUrl.pathname === '/api/v2/check') {
    const ipAddress = requestUrl.searchParams.get('ipAddress') ?? '8.8.8.8';
    sendJson(
      response,
      200,
      {
        data: {
          ipAddress,
          abuseConfidenceScore: ipAddress === '8.8.8.8' ? 0 : 17,
          usageType: 'Data Center/Web Hosting/Transit',
          isp: 'Declarative Connector PoC',
          countryCode: 'US',
          totalReports: ipAddress === '8.8.8.8' ? 0 : 2,
        },
      },
      {
        'x-ratelimit-remaining': '99',
        'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
      }
    );
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/v2/report') {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const form = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    sendJson(response, 200, {
      data: {
        ipAddress: form.get('ip'),
        categories: form.get('categories')?.split(',').map(Number) ?? [],
        comment: form.get('comment') ?? undefined,
        abuseConfidenceScore: 25,
      },
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/v1/users') {
    const page = requestUrl.searchParams.get('after') ?? 'page1';
    const pages = {
      page1: [
        { id: '00u1', status: 'ACTIVE', profile: { login: 'ada@example.com' } },
        { id: '00u2', status: 'ACTIVE', profile: { login: 'grace@example.com' } },
      ],
      page2: [
        { id: '00u3', status: 'SUSPENDED', profile: { login: 'alan@example.com' } },
        { id: '00u4', status: 'ACTIVE', profile: { login: 'margaret@example.com' } },
      ],
      page3: [{ id: '00u5', status: 'ACTIVE', profile: { login: 'linus@example.com' } }],
    };
    const nextPages = { page1: 'page2', page2: 'page3', page3: undefined };
    const link = buildNextLink(requestUrl, nextPages[page]);
    sendJson(response, 200, pages[page] ?? [], {
      ...(link ? { Link: link } : {}),
      'x-rate-limit-remaining': '98',
      'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 60),
    });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/v1/logs') {
    const page = requestUrl.searchParams.get('after') ?? 'page1';
    const pages = {
      page1: [
        { uuid: 'event-1', eventType: 'user.session.start', outcome: { result: 'SUCCESS' } },
        { uuid: 'event-2', eventType: 'user.authentication.auth_via_mfa' },
      ],
      page2: [{ uuid: 'event-3', eventType: 'user.session.end' }],
    };
    const link = buildNextLink(requestUrl, page === 'page1' ? 'page2' : undefined);
    sendJson(response, 200, pages[page] ?? [], {
      ...(link ? { Link: link } : {}),
      'x-rate-limit-remaining': '97',
      'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 60),
    });
    return;
  }

  sendJson(response, 404, { error: `No mock route for ${request.method} ${requestUrl.pathname}` });
}).listen(port, '127.0.0.1', () => {
  console.log(`Declarative connector mock APIs: http://127.0.0.1:${port}`);
});
