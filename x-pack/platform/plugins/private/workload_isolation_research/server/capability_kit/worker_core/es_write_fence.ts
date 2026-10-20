/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Boot-phase fence for the worker's Elasticsearch client.
 * Records method and path only (never body, headers, or credentials). */

import { appendFileSync } from 'fs';
import type {
  OnRequestHandler,
  OnRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';

/**
 * Read routes the alerting subset actually sends, matched by segment position.
 * A segment that starts with `_` is an API. Anything else is a target: index names
 * cannot start with `_`, so `/_scripts/_search` is not `/{target}/_search`.
 * Boot record on t7p-wc sent the two index-template simulate paths. The other
 * templates are the search/ES|QL/pit/scroll routes from alerting runs.
 */
type RoutePart = { readonly kind: 'target' } | { readonly kind: 'api'; readonly name: string };
const target: RoutePart = { kind: 'target' };
const api = (name: string): RoutePart => ({ kind: 'api', name });
const READ_ROUTE_TEMPLATES: readonly { method: string; parts: readonly RoutePart[] }[] = [
  { method: 'POST', parts: [api('_search')] },
  { method: 'POST', parts: [target, api('_search')] },
  { method: 'POST', parts: [api('_msearch')] },
  { method: 'POST', parts: [target, api('_msearch')] },
  { method: 'POST', parts: [target, api('_count')] },
  { method: 'POST', parts: [api('_mget')] },
  { method: 'POST', parts: [target, api('_mget')] },
  { method: 'POST', parts: [api('_query')] },
  { method: 'POST', parts: [target, api('_field_caps')] },
  { method: 'POST', parts: [api('_pit')] },
  { method: 'POST', parts: [target, api('_pit')] },
  { method: 'POST', parts: [api('_search'), api('scroll')] },
  { method: 'DELETE', parts: [api('_pit')] },
  { method: 'DELETE', parts: [api('_search'), api('scroll')] },
  { method: 'POST', parts: [api('_index_template'), api('_simulate')] },
  { method: 'POST', parts: [api('_index_template'), api('_simulate'), target] },
  { method: 'POST', parts: [api('_index_template'), api('_simulate_index')] },
  { method: 'POST', parts: [api('_index_template'), api('_simulate_index'), target] },
];

export interface EsWriteAllow {
  readonly method: string;
  /** Anchored path. Substring matches are not allowed. */
  readonly path: RegExp;
}

export interface EsRequestRecord {
  readonly method: string;
  readonly path: string;
  readonly write: boolean;
  readonly phase: 'boot' | 'run';
}

export interface EsWriteSummary {
  readonly writes: number;
  readonly reads: number;
  readonly denied: number;
  readonly kinds: Readonly<Record<string, number>>;
}

const barePath = (path: string): string => path.split('?')[0];

/**
 * One decode. Encoded `/` or `_`, `//`, and `.` / `..` segments are not routes:
 * they stay writes so a write cannot borrow a read template.
 */
export const routeSegments = (path: string): readonly string[] | undefined => {
  const raw = barePath(path);
  if (raw.includes('//') || /%2f/i.test(raw) || /%5f/i.test(raw)) return undefined;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return undefined;
  }
  if (decoded.includes('//') || /%2f/i.test(decoded) || /%5f/i.test(decoded)) return undefined;
  const segments = decoded.startsWith('/') ? decoded.slice(1).split('/') : decoded.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return undefined;
  }
  return segments;
};

const isReadRoute = (method: string, path: string): boolean => {
  const segments = routeSegments(path);
  if (!segments) return false;
  const verb = method.toUpperCase();
  return READ_ROUTE_TEMPLATES.some(
    (template) =>
      template.method === verb &&
      template.parts.length === segments.length &&
      template.parts.every((part, index) =>
        part.kind === 'target' ? !segments[index].startsWith('_') : segments[index] === part.name
      )
  );
};

/** True for mutations. GET and HEAD are reads. Other methods are writes unless a route template matches. */
export const isEsWrite = (method: string, path: string): boolean => {
  const verb = method.toUpperCase();
  if (verb === 'GET' || verb === 'HEAD') return false;
  if (isReadRoute(verb, path)) return false;
  return verb === 'POST' || verb === 'PUT' || verb === 'DELETE' || verb === 'PATCH';
};

const kindOf = (record: EsRequestRecord): string => {
  const path = record.path.split('?')[0];
  const marker = path.match(
    /_(bulk|doc|create|update|delete_by_query|update_by_query|mapping|aliases|alias|index_template|component_template|template|ilm|security|refresh|flush)(\/|$)/
  );
  return `${record.method.toUpperCase()} ${marker ? `_${marker[1]}` : path}`;
};

export interface BootEsWriteFence {
  readonly endBoot: () => void;
  /** Ends the boot phase after these installer promises settle. A sleep is not a boundary. */
  readonly awaitInstallers: (
    installers: ReadonlyArray<Promise<unknown> | undefined>
  ) => Promise<void>;
  readonly records: () => readonly EsRequestRecord[];
  readonly summary: () => EsWriteSummary;
  readonly wrap: (factory: OnRequestHandlerFactory) => OnRequestHandlerFactory;
}

/**
 * Boot writes of the alerting class (t7p-wc-boot-writes-002, record then deny).
 * Prefixes cover a fresh cluster (create templates, data stream, locks, first bulk)
 * and a warm cluster (mapping update on the existing event-log data stream).
 */
/**
 * Exact boot writes measured on t7p-wc (record then deny).
 * `POST /.kibana-event-log-ds/_delete_by_query` is not in this set.
 */
export const ALERTING_BOOT_ES_WRITE_ALLOW: readonly EsWriteAllow[] = [
  { method: 'PUT', path: /^\/_component_template\/\.kibana_locks-component$/ },
  { method: 'PUT', path: /^\/_index_template\/\.kibana-event-log-template$/ },
  { method: 'PUT', path: /^\/_index_template\/\.kibana_locks-index-template$/ },
  { method: 'PUT', path: /^\/_data_stream\/\.kibana-event-log-ds$/ },
  { method: 'PUT', path: /^\/\.kibana_locks-000001$/ },
  { method: 'PUT', path: /^\/\.kibana-event-log-ds\/_mapping$/ },
  { method: 'POST', path: /^\/\.kibana-event-log-ds\/_bulk$/ },
  // Lock-manager document upsert the alerting installer issues while acquiring
  // `alerting:resource-install:common`. A locks-index delete-by-query stays denied.
  { method: 'POST', path: /^\/\.kibana_locks-\d+\/_update\/[^/?]+$/ },
];

/** Wraps Core's onRequest factory. Deny mode rejects non-allowlisted boot writes before they are sent. */
export const createBootEsWriteFence = (options: {
  readonly mode: 'record' | 'deny';
  readonly allow?: readonly EsWriteAllow[];
}): BootEsWriteFence => {
  let phase: 'boot' | 'run' = 'boot';
  const seen: EsRequestRecord[] = [];
  let denied = 0;
  const allow = options.allow ?? [];
  const permitted = (record: EsRequestRecord): boolean =>
    allow.some(
      (entry) =>
        entry.method.toUpperCase() === record.method.toUpperCase() &&
        entry.path.test(barePath(record.path))
    );
  const observe: OnRequestHandler = (_ctx, params) => {
    const method = String(params.method ?? 'GET');
    const path = String(params.path ?? '');
    const write = isEsWrite(method, path);
    const record: EsRequestRecord = { method, path, write, phase };
    seen.push(record);
    const logPath = process.env.KBN_RESEARCH_WC_ES_LOG;
    if (logPath) {
      appendFileSync(logPath, `${JSON.stringify({ method, path, write, phase })}\n`);
    }
    if (write && phase === 'boot' && options.mode === 'deny' && !permitted(record)) {
      denied += 1;
      throw new Error(`worker-core boot ES write denied: ${method.toUpperCase()} ${path}`);
    }
  };
  return {
    endBoot: () => {
      phase = 'run';
    },
    awaitInstallers: async (installers) => {
      await Promise.allSettled(installers.filter((job): job is Promise<unknown> => Boolean(job)));
      phase = 'run';
    },
    records: () => seen,
    summary: () => {
      const kinds: Record<string, number> = {};
      let writes = 0;
      let reads = 0;
      for (const record of seen) {
        if (record.phase !== 'boot') continue;
        if (record.write) {
          writes += 1;
          const kind = kindOf(record);
          kinds[kind] = (kinds[kind] ?? 0) + 1;
        } else {
          reads += 1;
        }
      }
      return { writes, reads, denied, kinds };
    },
    wrap: (factory) => (opts) => {
      const inner = factory(opts);
      const wrapped: OnRequestHandler = (ctx, params, requestOptions, logger) => {
        observe(ctx, params, requestOptions, logger);
        return inner(ctx, params, requestOptions, logger);
      };
      return wrapped;
    },
  };
};
