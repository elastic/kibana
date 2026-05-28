/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';
import {
  KI_SML_TYPE,
  KI_ORIGIN_KIND_FEATURE,
  KI_ORIGIN_KIND_QUERY,
  encodeKiOriginId,
  type KiOriginKind,
} from '@kbn/streams-schema';
import type { StreamAssetIndexer } from '../../lib/streams/sml_writer';

/**
 * Internal verb the indexer accepts — `'create'` and `'update'` collapse to
 * a single `'upsert'` because the SML treats both identically. Not exported:
 * external callers should go through the `StreamAssetIndexer` adapter, which
 * has the same shape but no KI-specific naming.
 */
type KnowledgeIndicatorAction = 'upsert' | 'delete';

/**
 * Single indexer instance used by both Feature and Query KIs. The Feature /
 * Query clients see only a {@link StreamAssetIndexer} (no `kind` knowledge);
 * the per-kind adapters below stamp the right KI origin id before delegating
 * here.
 */
export interface KnowledgeIndicatorEventIndexer {
  notify: (params: { kind: KiOriginKind; id: string; action: KnowledgeIndicatorAction }) => void;
}

/**
 * Maximum number of `notify` calls we hold while waiting for the real impl
 * to be wired in. Beyond this, the oldest entry is evicted with a warning so
 * a stuck setup-to-start phase doesn't grow memory unbounded. The crawler
 * will still pick up dropped writes on its next pass.
 */
const PENDING_QUEUE_CAPACITY = 1024;

interface PendingNotification {
  kind: KiOriginKind;
  id: string;
  action: KnowledgeIndicatorAction;
  queuedAt: number;
}

/**
 * The proxy reference is mutable on purpose: callers wire it up in plugin
 * `setup()` (before `AgentContextLayer.start()` has resolved the real impl)
 * and the real impl is plugged in once `core.getStartServices()` resolves.
 *
 * The indexer guarantees:
 *   - **No lost writes during the setup-to-start gap.** Calls received before
 *     `setImpl` runs land in a bounded ring buffer and are drained on
 *     `setImpl`. Beyond `PENDING_QUEUE_CAPACITY` the oldest call is dropped
 *     with a `logger.warn`; the crawler reconciles eventually.
 *   - **Per-origin serialization.** Two concurrent calls for the same origin
 *     id are chained so an `upsert` can't race a `delete` and end up with
 *     stale chunks. Different origins still parallelize.
 *
 * Failures from `impl(...)` are logged and never propagated; the underlying
 * KI write must not be blocked by a degraded SML.
 */
export const createKnowledgeIndicatorEventIndexer = (
  logger: Logger
): KnowledgeIndicatorEventIndexer & {
  setImpl: (impl: AgentContextLayerPluginStart['indexAttachmentAsInternal']) => void;
} => {
  let impl: AgentContextLayerPluginStart['indexAttachmentAsInternal'] | undefined;
  const pending: PendingNotification[] = [];
  const inFlight = new Map<string, Promise<void>>();

  const dispatch = (notification: PendingNotification): void => {
    if (!impl) {
      return;
    }
    const { kind, id, action } = notification;
    const originId = encodeKiOriginId({ kind, id });
    const smlAction = action === 'delete' ? 'delete' : 'create';

    const previous = inFlight.get(originId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        if (!impl) {
          return;
        }
        try {
          await impl({
            originId,
            attachmentType: KI_SML_TYPE,
            action: smlAction,
            spaces: ['*'],
          });
        } catch (error) {
          logger.warn(
            `KI event indexer: ${action} for '${originId}' failed: ${(error as Error).message}`
          );
        }
      })
      .finally(() => {
        if (inFlight.get(originId) === next) {
          inFlight.delete(originId);
        }
      });
    inFlight.set(originId, next);
  };

  return {
    setImpl: (next) => {
      impl = next;
      while (pending.length > 0) {
        dispatch(pending.shift()!);
      }
    },
    notify: ({ kind, id, action }) => {
      if (!impl) {
        if (pending.length >= PENDING_QUEUE_CAPACITY) {
          const dropped = pending.shift()!;
          logger.warn(
            `KI event indexer: pending queue at capacity (${PENDING_QUEUE_CAPACITY}), dropping oldest ` +
              `(${dropped.action} ${dropped.kind}:${dropped.id} queued ${
                Date.now() - dropped.queuedAt
              }ms ago)`
          );
        }
        pending.push({ kind, id, action, queuedAt: Date.now() });
        return;
      }
      dispatch({ kind, id, action, queuedAt: Date.now() });
    },
  };
};

/**
 * Wrap a {@link KnowledgeIndicatorEventIndexer} into the generic
 * {@link StreamAssetIndexer} that `FeatureClient` consumes. The adapter is
 * the only place that knows the calls represent feature KIs.
 */
export const createFeatureKiAdapter = (
  indexer: KnowledgeIndicatorEventIndexer
): StreamAssetIndexer => ({
  notify: (action, id) => indexer.notify({ kind: KI_ORIGIN_KIND_FEATURE, id, action }),
});

/**
 * Adapter for `QueryClient` — same as {@link createFeatureKiAdapter} but
 * stamps `kind: 'query'`.
 */
export const createQueryKiAdapter = (
  indexer: KnowledgeIndicatorEventIndexer
): StreamAssetIndexer => ({
  notify: (action, id) => indexer.notify({ kind: KI_ORIGIN_KIND_QUERY, id, action }),
});
