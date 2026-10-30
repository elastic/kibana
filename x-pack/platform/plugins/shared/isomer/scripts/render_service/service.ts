/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A standalone Isomer render service, shaped like page-render-service: one render at a time, a 429 when busy,
// readiness once the render process is warm, a drain on SIGTERM, and a Prometheus busy signal. `bundle.js`
// builds it from this checkout into a Docker image. See README.md.

import { existsSync, readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { exampleNodes, type Composition } from '@elastic/isomer-sdk';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';
import { fromRoot } from '@kbn/repo-info';

import { createRuntime } from '../../server/create_runtime';
import { createRenderHost, type RenderHost } from '../../server/render_host/client';
import type { HostDrawOptions } from '../../server/render_host/protocol';
import { describeVocabulary } from '../../server/vocabulary';

declare const ISOMER_RENDER_BUILD: {
  sha: string;
  builtAt: string;
  versions: Record<string, string>;
};

const SERVICE = 'isomer-render-service';
const RENDER_PATH = '/v1/render-composition';
const REJECTION_HEADER = 'x-isomer-render-service-rejection';
const VOCABULARY_HEADER = 'x-isomer-vocabulary';

const env = process.env;
const int = (key: string, fallback: number) => {
  const raw = env[key];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${key} must be a positive integer`);
  return value;
};

const config = {
  port: int('PORT', 3000),
  listenHost: env.LISTEN_HOST || '127.0.0.1',
  bodyLimitBytes: int('BODY_LIMIT_BYTES', 20 * 1024 * 1024),
  /** One draw's ceiling, after which the render process is killed and replaced. */
  renderTimeoutMs: int('RENDER_TIMEOUT_MS', 60_000),
  /** The render process's V8 old-space cap. */
  renderHeapMb: int('RENDER_HEAP_MB', 256),
  /** How long the render process stays warm with nothing to draw. */
  renderIdleMs: int('RENDER_IDLE_MS', 10 * 60_000),
  windowSeconds: int('AUTOSCALING_WINDOW_SECONDS', 60),
  drainDelayMs: env.KUBERNETES_SERVICE_HOST ? 5_000 : 0,
  buildSha: env.BUILD_SHA || ISOMER_RENDER_BUILD.sha,
};

const WORLD_COUNTRIES = fromRoot(
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/files/world_countries_v7.geo.json'
);

// --- one render at a time -----------------------------------------------------------------------------------

const createLimiter = (max: number, onChange: (inFlight: number) => void) => {
  let count = 0;
  let waiters: Array<() => void> = [];
  return {
    tryAcquire(): (() => void) | null {
      if (count >= max) return null;
      count += 1;
      onChange(count);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        count -= 1;
        onChange(count);
        if (count === 0) {
          const resolved = waiters;
          waiters = [];
          resolved.forEach((resolve) => resolve());
        }
      };
    },
    inFlight: () => count,
    idle: () =>
      count === 0 ? Promise.resolve() : new Promise<void>((resolve) => waiters.push(resolve)),
  };
};

/** The share of the last `windowSeconds` this pod spent rendering: page-render-service's busy signal, without the waiting term. */
const createDemandWindow = (windowSeconds: number) => {
  const windowMs = windowSeconds * 1000;
  const spans: Array<{ from: number; to?: number }> = [];
  return {
    renderingChanged(inFlight: number) {
      const now = Date.now();
      if (inFlight > 0) spans.push({ from: now });
      else spans.forEach((span) => (span.to ??= now));
    },
    demand() {
      const now = Date.now();
      const start = now - windowMs;
      let busy = 0;
      for (let index = spans.length - 1; index >= 0; index -= 1) {
        const { from, to = now } = spans[index];
        if (to < start) {
          spans.splice(index, 1);
          continue;
        }
        busy += to - Math.max(from, start);
      }
      return busy / windowMs;
    },
  };
};

// --- http ---------------------------------------------------------------------------------------------------

class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly body: object = {}) {
    super(message);
  }
}

const readJson = (request: IncomingMessage, limit: number) =>
  new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'Request body exceeds the configured size limit'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'Request body is not JSON'));
      }
    });
    request.on('error', reject);
  });

const send = (
  response: ServerResponse,
  status: number,
  body: object | Buffer | string,
  headers: Record<string, string> = {}
) => {
  const payload = Buffer.isBuffer(body)
    ? body
    : typeof body === 'string'
    ? body
    : JSON.stringify(body);
  response.writeHead(status, {
    'content-type': Buffer.isBuffer(body)
      ? headers['content-type'] ?? 'application/octet-stream'
      : typeof body === 'string'
      ? 'text/plain; version=0.0.4; charset=utf-8'
      : 'application/json',
    ...headers,
  });
  response.end(payload);
};

const DRAW_OPTION_KEYS = new Set<keyof HostDrawOptions>([
  'frame',
  'width',
  'height',
  'theme',
  'chartSize',
  'dashboardWidth',
  'chartHints',
  'scale',
  'format',
  'metadata',
]);

interface RenderBody {
  composition: Composition;
  options: HostDrawOptions;
  expects?: { vocabulary?: string };
}

const parseRenderBody = (value: unknown): RenderBody => {
  if (!value || typeof value !== 'object') throw new HttpError(400, 'Expected a JSON object');
  const { composition, options = {}, expects } = value as Record<string, unknown>;
  if (!composition || typeof composition !== 'object') {
    throw new HttpError(400, 'body.composition is required');
  }
  if (typeof options !== 'object' || options === null) {
    throw new HttpError(400, 'body.options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (!DRAW_OPTION_KEYS.has(key as keyof HostDrawOptions)) {
      throw new HttpError(400, `body.options.${key} is not a draw option`);
    }
  }
  const { format = 'png' } = options as HostDrawOptions;
  if (format !== 'png' && format !== 'pdf') {
    throw new HttpError(400, 'body.options.format must be "png" or "pdf"');
  }
  return {
    composition: composition as Composition,
    options: { ...(options as HostDrawOptions), format },
    ...(expects && typeof expects === 'object'
      ? { expects: expects as RenderBody['expects'] }
      : {}),
  };
};

// --- main ---------------------------------------------------------------------------------------------------

const log = (level: 'info' | 'warn' | 'error', message: string, fields: object = {}) =>
  process.stdout.write(
    `${JSON.stringify({
      '@timestamp': new Date().toISOString(),
      'log.level': level,
      message,
      'service.name': SERVICE,
      'service.version': config.buildSha,
      ...fields,
    })}\n`
  );

const main = async () => {
  const geometry: MapGeometry = {};
  if (existsSync(WORLD_COUNTRIES)) {
    geometry.world_countries = JSON.parse(readFileSync(WORLD_COUNTRIES, 'utf8'));
  }
  const runtime = await createRuntime();
  const { packs, vocabulary } = describeVocabulary(runtime);
  const versions = ISOMER_RENDER_BUILD.versions;
  const status = {
    service: SERVICE,
    version: config.buildSha,
    builtAt: ISOMER_RENDER_BUILD.builtAt,
    node: process.version,
    isomer: {
      sdk: versions['@elastic/isomer-sdk'],
      runtime: versions['@elastic/isomer-runtime'],
      imageTakumi: versions['@elastic/isomer-image-takumi'],
    },
    vocabulary,
    packs: Object.fromEntries(Object.entries(packs).map(([id, pack]) => [id, pack.vocabulary])),
  };
  const capabilities = {
    ...runtime.getCapabilities(),
    formats: ['png', 'pdf'],
    vocabulary,
    packs,
    versions: status.isomer,
  };

  const renderHost: RenderHost = createRenderHost({
    geometry,
    heapMb: config.renderHeapMb,
    idleMs: config.renderIdleMs,
    jobTimeoutMs: config.renderTimeoutMs,
    pdfThread: 'inline',
  });

  const demand = createDemandWindow(config.windowSeconds);
  const limiter = createLimiter(1, (inFlight) => demand.renderingChanged(inFlight));
  let draining = false;
  let warm = false;

  /** A composition from every primitive's first example, for a smoke test or a look at the vocabulary. */
  const examples = (only?: Set<string>): Composition =>
    ({
      type: 'view',
      body: runtime.packs
        .filter(({ id }) => !only || only.has(id))
        .flatMap(({ primitives }) =>
          primitives.flatMap((definition) => exampleNodes(definition).slice(0, 1))
        ),
    } as Composition);

  // The first draw pays for jsdom, Skia, Elastic Charts and takumi; readiness waits for it, as page-render-service's waits for Chromium.
  const prewarm = () =>
    renderHost
      .drawPng(examples(new Set(['components'])), { width: 400 })
      .then(() => {
        warm = true;
        log('info', 'render process is warm', { pid: renderHost.pid });
      })
      .catch((error: Error) =>
        log('error', 'render process failed to warm', { error: error.message })
      );

  const render = async (body: RenderBody, response: ServerResponse) => {
    if (body.expects?.vocabulary && body.expects.vocabulary !== vocabulary) {
      throw new HttpError(
        409,
        'The caller expects a different Isomer vocabulary than this service renders',
        {
          code: 'VOCABULARY_MISMATCH',
          expected: body.expects.vocabulary,
          actual: vocabulary,
          packs: status.packs,
        }
      );
    }
    const checked = runtime.validate(body.composition);
    if (!checked.valid) {
      throw new HttpError(400, "The composition does not validate against this service's packs", {
        code: 'INVALID_COMPOSITION',
        errors: checked.errors,
      });
    }
    if (draining) {
      throw new HttpError(503, 'The service is shutting down', { [REJECTION_HEADER]: 'draining' });
    }
    const release = limiter.tryAcquire();
    if (!release) {
      throw new HttpError(429, 'A render is in progress', { [REJECTION_HEADER]: 'saturated' });
    }
    const started = Date.now();
    try {
      const { format, ...options } = body.options;
      // Validation above is a gate; the render process validates what it draws on its own.
      const bytes =
        format === 'pdf'
          ? await renderHost.drawPdf(body.composition, options)
          : await renderHost.drawPng(body.composition, options);
      send(response, 200, bytes, {
        'content-type': format === 'pdf' ? 'application/pdf' : 'image/png',
        'x-render-total-ms': String(Date.now() - started),
        [VOCABULARY_HEADER]: vocabulary,
      });
      log('info', 'render completed', { format, ms: Date.now() - started, bytes: bytes.length });
    } catch (error) {
      const message = (error as Error).message;
      const timedOut = /took over/.test(message);
      throw new HttpError(timedOut ? 504 : 500, message, {
        code: timedOut ? 'RENDER_TIMEOUT' : 'RENDER_FAILED',
      });
    } finally {
      release();
    }
  };

  const handle = async (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const { method } = request;
    if (method === 'GET' && url.pathname === '/healthz') return send(response, 200, { ok: true });
    if (method === 'GET' && url.pathname === '/readyz') {
      if (draining) return send(response, 503, { ready: false, reason: 'draining' });
      if (!warm) return send(response, 503, { ready: false, reason: 'render process is not warm' });
      return send(response, 200, { ready: true, pid: renderHost.pid });
    }
    if (method === 'GET' && url.pathname === '/status') return send(response, 200, status);
    if (method === 'GET' && url.pathname === '/metrics') {
      return send(
        response,
        200,
        [
          '# TYPE isomer_render_demand gauge',
          `isomer_render_demand ${demand.demand().toFixed(4)}`,
          '# TYPE isomer_render_active gauge',
          `isomer_render_active ${limiter.inFlight()}`,
          '# TYPE isomer_render_capacity gauge',
          'isomer_render_capacity 1',
          '',
        ].join('\n')
      );
    }
    if (method === 'GET' && url.pathname === '/v1/capabilities')
      return send(response, 200, capabilities);
    if (method === 'GET' && url.pathname === '/v1/examples') {
      const only = url.searchParams.get('packs');
      return send(response, 200, examples(only ? new Set(only.split(',')) : undefined));
    }
    if (method === 'POST' && url.pathname === RENDER_PATH) {
      const body = parseRenderBody(await readJson(request, config.bodyLimitBytes));
      return render(body, response);
    }
    throw new HttpError(404, `No route for ${method} ${url.pathname}`);
  };

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      if (response.headersSent) return;
      if (error instanceof HttpError) {
        const { status: code, message, body } = error;
        const rejection = (body as Record<string, string>)[REJECTION_HEADER];
        send(
          response,
          code,
          { error: message, ...body },
          // Kubernetes balances connections, so a retry on a kept-alive socket would land here again.
          rejection ? { [REJECTION_HEADER]: rejection, connection: 'close' } : {}
        );
        if (code >= 500) log('error', message, { status: code });
        return;
      }
      log('error', 'request failed', { error: (error as Error).message });
      send(response, 500, { error: 'Internal error' });
    });
  });

  const drain = async () => {
    if (draining) return;
    draining = true;
    log('info', 'draining: refusing new renders, finishing the one in flight', {
      inFlight: limiter.inFlight(),
    });
    await Promise.all([
      limiter.idle(),
      new Promise((resolve) => setTimeout(resolve, config.drainDelayMs)),
    ]);
    server.close();
    await renderHost.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void drain());
  process.on('SIGINT', () => void drain());

  server.listen(config.port, config.listenHost, () => {
    log('info', `${SERVICE} listening`, {
      listenHost: config.listenHost,
      port: config.port,
      vocabulary,
      packs: status.packs,
      renderTimeoutMs: config.renderTimeoutMs,
      renderHeapMb: config.renderHeapMb,
    });
    void prewarm();
  });
};

main().catch((error: Error) => {
  log('error', 'failed to start', { error: error.stack ?? error.message });
  process.exit(1);
});
