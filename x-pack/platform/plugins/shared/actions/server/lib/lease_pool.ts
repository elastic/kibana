/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * PoC: process-scoped client reuse for connector actions.
 *
 * Before this PoC, MCP (and future DB/gRPC clients) were built inside each handler and torn
 * down when the action returned: fine for stateless HTTP (Axios), expensive for connect /
 * handshake clients.
 *
 * LeasePool dedupes builds per key and shares one in-flight Promise across concurrent callers
 * (anti-stampede). Failed builds evict the slot so the next lease can retry.
 *
 * PoC limits: no TTL / eviction on success, and ClientTypeSpec.terminate() is not wired from
 * the pool yet.
 */
export class LeasePool<TClient> {
  private readonly map = new Map<string, Promise<TClient>>();

  lease(key: string, buildFn: () => Promise<TClient>): Promise<TClient> {
    const existing = this.map.get(key);
    if (existing !== undefined) {
      return existing;
    }

    // Store the Promise, not the resolved client: concurrent lease() on a cold key must await
    // the same in-flight build, not start N parallel connects.
    const promise = Promise.resolve()
      .then(() => buildFn())
      .catch((err) => {
        // A rejected build must not poison the map; otherwise every later lease() would return
        // the same failed Promise and the connector could never recover.
        this.map.delete(key);
        throw err;
      });

    this.map.set(key, promise);
    return promise;
  }
}
