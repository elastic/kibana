/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Boot-phase fence for the worker's Elasticsearch client.
 * Records method and path only (never body, headers, or credentials). */

import type {
  OnRequestHandler,
  OnRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';

const READ_POST =
  /\/(_search|_msearch|_async_search|_eql\/search|_count|_field_caps|_validate\/query|_mget|_pit|_query|_render\/template|_analyze)(\/|$|\?)/;

/** Template simulation only. A document update such as `/orders/_update/_simulate` stays a write. */
const INDEX_TEMPLATE_SIMULATE = /^\/_index_template\/_simulate(?:_index)?(?:\/|$)/;

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

/** True for mutations. Search-shaped POSTs and index-template `_simulate` stay reads. */
export const isEsWrite = (method: string, path: string): boolean => {
  const verb = method.toUpperCase();
  const pathOnly = barePath(path);
  if (verb === 'GET' || verb === 'HEAD') return false;
  if (verb === 'POST' && (READ_POST.test(pathOnly) || INDEX_TEMPLATE_SIMULATE.test(pathOnly)))
    return false;
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
  readonly awaitInstallers: (installers: ReadonlyArray<Promise<unknown> | undefined>) => Promise<void>;
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
