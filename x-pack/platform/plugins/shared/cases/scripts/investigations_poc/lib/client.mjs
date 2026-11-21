// Shared helpers for the investigations POC scripts (setup, seeds, load test, migration).
// Only talks to localhost by default; override with KBN_URL, ES_URL, KBN_AUTH (user:pass).
import crypto from 'node:crypto';

export const KBN = process.env.KBN_URL ?? 'http://localhost:5602';
export const ES = process.env.ES_URL ?? 'http://localhost:9201';
const DEFAULT_AUTH = process.env.KBN_AUTH ?? 'elastic:changeme';

export const AUTH_HEADER = (user, pass) => {
  const creds = user === undefined ? DEFAULT_AUTH : `${user}:${pass ?? 'changeme'}`;
  return `Basic ${Buffer.from(creds).toString('base64')}`;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);

export const sha256 = (str) => crypto.createHash('sha256').update(String(str)).digest('hex');

// Deterministic UUID-shaped id (version nibble 5) derived from sha1(namespace + name).
export const uuidv5Like = (namespace, name) => {
  const hex = crypto.createHash('sha1').update(`${namespace}${name}`).digest('hex');
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-');
};

export const parseArgs = (argv = process.argv) => {
  const args = {};
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      (args._ ??= []).push(token);
      continue;
    }
    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (rest[i + 1] !== undefined && !rest[i + 1].startsWith('--')) {
      args[rawKey] = rest[++i];
    } else {
      args[rawKey] = true;
    }
  }
  return args;
};

const request = async (base, method, path, body, opts, defaultHeaders) => {
  const { okStatuses = [200, 201, 204], auth, headers = {} } = opts;
  const isNdjson = typeof body === 'string';
  const started = Date.now();
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: auth ? AUTH_HEADER(...auth.split(/:(.*)/s, 2)) : AUTH_HEADER(),
      'Content-Type': isNdjson ? 'application/x-ndjson' : 'application/json',
      ...defaultHeaders,
      ...headers,
    },
    body: body === undefined ? undefined : isNdjson ? body : JSON.stringify(body),
  });
  const text = await res.text();
  const ms = Date.now() - started;
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!okStatuses.includes(res.status)) {
    throw Object.assign(
      new Error(`${method} ${base}${path} -> ${res.status}: ${text.slice(0, 800)}`),
      { status: res.status, json, text }
    );
  }
  return { status: res.status, json, text, ms };
};

// Kibana request. `public: true` adds the API version header used by public routes.
export const kbn = (method, path, body, opts = {}) =>
  request(KBN, method, path, body, opts, {
    'kbn-xsrf': 'investigations-poc',
    'x-elastic-internal-origin': 'kibana',
    ...(opts.public ? { 'elastic-api-version': '2023-10-31' } : {}),
  });

// Elasticsearch request. A string body is sent as NDJSON (e.g. _bulk).
export const es = (method, path, body, opts = {}) => request(ES, method, path, body, opts, {});

export const waitForKibana = async ({ timeoutMs = 5 * 60 * 1000, intervalMs = 3000 } = {}) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const { json } = await kbn('GET', '/api/status', undefined, { okStatuses: [200] });
      const level = json?.status?.overall?.level;
      if (level === 'available') return json;
      lastError = `overall status: ${level}`;
    } catch (e) {
      lastError = e.message;
    }
    await sleep(intervalMs);
  }
  throw new Error(`Kibana at ${KBN} not available after ${timeoutMs}ms (${lastError})`);
};
