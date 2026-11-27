#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A tiny fake ticketing system for the Cases Webhook connector (`.cases-webhook`).
//
//   POST  /tickets                 create  (Cases push: createIncidentUrl)     -> { id, key, ... }
//   GET   /tickets/:id             read    (Cases push: getIncidentUrl; sync pull)
//   PUT   /tickets/:id             update  (Cases push: updateIncidentUrl)
//   POST  /tickets/:id/comments    comment (Cases push: createCommentUrl)
//   GET   /tickets/:id/view        HTML page (viewIncidentUrl, the link shown in Kibana)
//   PATCH /tickets/:id             an edit made "in the ticketing system" (used to test sync)
//   GET   /tickets                 list
//
// Tickets are kept in memory and saved to $UIPOC_TICKETS_FILE (default: <tmp>/uipoc_tickets.json).
// Listens on 127.0.0.1 only. Usage: node ticket_server.mjs [--port 9300]

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const portArg = process.argv.indexOf('--port');
const PORT = Number(portArg > 0 ? process.argv[portArg + 1] : process.env.UIPOC_TICKETS_PORT ?? 9300);
const FILE = process.env.UIPOC_TICKETS_FILE ?? path.join(os.tmpdir(), 'uipoc_tickets.json');
const MAX_BODY = 1024 * 1024;
const STATUSES = ['open', 'in_progress', 'closed'];

const state = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : { next: 1001, tickets: {} };
const save = () => writeFileSync(FILE, JSON.stringify(state, null, 2));
const now = () => new Date().toISOString();

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(new Error(`Body is not JSON: ${text.slice(0, 200)}`));
      }
    });
  });

const asText = (value) => (value === undefined || value === null ? null : String(value).slice(0, 30000));
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const viewPage = (t) => `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t.id)}</title>
<style>body{font:14px system-ui;margin:2rem;max-width:48rem}dt{font-weight:600;margin-top:.75rem}pre{white-space:pre-wrap}</style></head>
<body><h1>${escapeHtml(t.id)}: ${escapeHtml(t.title)}</h1><dl>
<dt>Status</dt><dd>${escapeHtml(t.status)}</dd><dt>Severity</dt><dd>${escapeHtml(t.severity)}</dd>
<dt>Tags</dt><dd>${escapeHtml((t.tags ?? []).join(', '))}</dd><dt>Description</dt><dd><pre>${escapeHtml(t.description)}</pre></dd>
<dt>Comments (${t.comments.length})</dt><dd>${t.comments.map((c) => `<pre>${escapeHtml(c.body)}</pre>`).join('')}</dd>
<dt>History</dt><dd>${t.history.map((h) => `${escapeHtml(h.at)} ${escapeHtml(h.by)}: ${escapeHtml(h.what)}`).join('<br>')}</dd></dl></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] !== 'tickets') {
      if (url.pathname === '/health') return send(res, 200, { ok: true, tickets: Object.keys(state.tickets).length });
      return send(res, 404, { error: 'Not found' });
    }
    const id = parts[1] ? decodeURIComponent(parts[1]) : undefined;
    const ticket = id ? state.tickets[id] : undefined;

    if (req.method === 'GET' && !id) return send(res, 200, { tickets: Object.values(state.tickets) });
    if (req.method === 'POST' && !id) {
      const body = await readJson(req);
      const newId = `SEC-${state.next++}`;
      const created = {
        id: newId,
        key: newId,
        title: asText(body.title) ?? '(no title)',
        description: asText(body.description) ?? '',
        tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 50) : [],
        severity: asText(body.severity),
        status: 'open',
        comments: [],
        created_at: now(),
        updated_at: now(),
        updated_by: 'kibana',
        history: [{ at: now(), by: 'kibana', what: 'created' }],
      };
      state.tickets[newId] = created;
      save();
      return send(res, 200, created);
    }
    if (!ticket) return send(res, 404, { error: `Ticket ${id} not found` });

    if (req.method === 'GET' && parts[2] === 'view') return send(res, 200, viewPage(ticket), 'text/html; charset=utf-8');
    if (req.method === 'GET' && !parts[2]) return send(res, 200, ticket);
    if (req.method === 'POST' && parts[2] === 'comments') {
      const body = await readJson(req);
      ticket.comments.push({ body: asText(body.body) ?? '', at: now(), by: 'kibana' });
      ticket.updated_at = now();
      ticket.history.push({ at: now(), by: 'kibana', what: 'comment added' });
      save();
      return send(res, 200, ticket);
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await readJson(req);
      const by = req.method === 'PUT' ? 'kibana' : 'external';
      const changed = [];
      for (const key of ['title', 'description', 'severity']) {
        if (body[key] !== undefined && asText(body[key]) !== ticket[key]) {
          ticket[key] = asText(body[key]);
          changed.push(key);
        }
      }
      if (Array.isArray(body.tags)) {
        ticket.tags = body.tags.map(String).slice(0, 50);
        changed.push('tags');
      }
      if (body.status !== undefined) {
        const status = String(body.status).toLowerCase().replace(/[\s-]+/g, '_');
        if (!STATUSES.includes(status)) return send(res, 400, { error: `status must be one of ${STATUSES.join(', ')}` });
        if (status !== ticket.status) {
          ticket.status = status;
          changed.push('status');
        }
      }
      ticket.updated_at = now();
      ticket.updated_by = by;
      ticket.history.push({ at: now(), by, what: changed.length ? `updated ${changed.join(', ')}` : 'no change' });
      save();
      return send(res, 200, ticket);
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    return send(res, 400, { error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[tickets] listening on http://127.0.0.1:${PORT} (data: ${FILE})`);
});
