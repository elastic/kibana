/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncLocalStorage } from 'async_hooks';

/** What a pod plugin contract may need to know about the run it is serving. */
export interface PodRunContext {
  executionUuid: string;
  callback?: { url: string; token: string };
  /** Calls into Kibana still in flight; the host drains these before answering `/run`. */
  pending: Set<Promise<unknown>>;
  /** Aborted when the run is cancelled or passes its deadline. */
  signal?: AbortSignal;
  /** Calls made into Kibana during the run, by `pluginId.method`. */
  calls: Record<string, number>;
}

const storage = new AsyncLocalStorage<PodRunContext>();

export const runWithContext = <T>(context: PodRunContext, fn: () => T): T =>
  storage.run(context, fn);

export const getRunContext = (): PodRunContext | undefined => storage.getStore();
