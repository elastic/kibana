/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isComputedFeature } from '@kbn/streams-schema';
import { isConditionComplete } from '@kbn/streamlang';
import type { StoredFeatureKnowledgeIndicator, StoredKnowledgeIndicator } from '../data_stream';
import { inPredicate, IS_NOT_DELETED } from '../esql_helpers';
import { KI_TYPE_FEATURE, STREAM_NAME } from '../fields';
import { fromStoredFeature, toStoredFeature, toStoredQuery, toTombstone } from './serializers';
import { bulkCreateWithInferenceFallback } from './bulk_with_inference_fallback';
import { StatusError } from '../../errors/status_error';
import type { RevisionReader } from './revision_reader';
import type { KIBulkOperation, KnowledgeIndicatorDataStreamClient } from './types';

export class IndicatorWriter {
  constructor(
    private readonly dataStreamClient: KnowledgeIndicatorDataStreamClient,
    private readonly logger: Logger,
    private readonly revisionReader: RevisionReader,
    private readonly ttlDays: number
  ) {}

  async bulk(
    stream: string,
    operations: KIBulkOperation[]
  ): Promise<{ applied: number; skipped: number }> {
    if (operations.length === 0) {
      return { applied: 0, skipped: 0 };
    }

    for (const op of operations) {
      if ('index' in op && 'feature' in op.index) {
        const f = op.index.feature;
        if (f.filter && !isConditionComplete(f.filter)) {
          throw new StatusError(`Invalid feature ${f.id}: filter is incomplete`, 400);
        }
      }
    }

    // Exclude requires a pre-read: the new revision must preserve the full
    // feature payload so the Excluded tab can render it and downstream
    // consumers (LLM dedup hint) have the fingerprint.
    const excludeOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { exclude: unknown }> => 'exclude' in op
    );
    const excludeIds = new Set(excludeOps.map((op) => op.exclude.id));
    const excludeLatest =
      excludeIds.size > 0
        ? await this.revisionReader.fetchLatestFeatures(stream, [...excludeIds])
        : [];
    const excludableLatest: StoredFeatureKnowledgeIndicator[] = [];
    let excludeSkipped = 0;
    for (const id of excludeIds) {
      const latest = excludeLatest.find((doc) => doc.id === id);
      if (!latest) {
        // Unknown id → no-op. Excluding an id that doesn't exist would
        // create an orphan revision; treat as skipped.
        excludeSkipped += 1;
        continue;
      }
      const asFeature = fromStoredFeature(latest);
      if (isComputedFeature(asFeature)) {
        // Computed features are derived; excluding them is meaningless
        // (they would be regenerated on the next run). Skip.
        excludeSkipped += 1;
        continue;
      }
      if (latest.excluded === true) {
        // Already excluded — avoid churn revisions that would add no
        // information and only consume retention.
        excludeSkipped += 1;
        continue;
      }
      excludableLatest.push(latest);
    }

    // Delete and restore both append a tombstone keyed on (type, id) without
    // a pre-read. A tombstone carries identity only, not payload, so reading
    // the latest revision adds no value — and tombstoning a non-existent id
    // is harmless and idempotent.
    const deleteOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { delete: unknown }> => 'delete' in op
    );
    const restoreOps = operations.filter(
      (op): op is Extract<KIBulkOperation, { restore: unknown }> => 'restore' in op
    );

    const indexOpsCount = operations.filter((op) => 'index' in op).length;
    const tombstoneCount = deleteOps.length + restoreOps.length;
    const totalApplied = indexOpsCount + excludableLatest.length + tombstoneCount;

    if (totalApplied === 0) {
      return { applied: 0, skipped: excludeSkipped };
    }

    await bulkCreateWithInferenceFallback(this.logger, ({ includeEmbedding }) => {
      const docs: StoredKnowledgeIndicator[] = [];
      for (const op of operations) {
        if ('index' in op) {
          if ('feature' in op.index) {
            docs.push(toStoredFeature(stream, op.index.feature, includeEmbedding, this.ttlDays));
          } else {
            docs.push(toStoredQuery(stream, op.index.query, includeEmbedding, this.ttlDays));
          }
        }
      }
      for (const latest of excludableLatest) {
        const feature = fromStoredFeature(latest);
        docs.push(
          toStoredFeature(stream, { ...feature, excluded: true }, includeEmbedding, this.ttlDays)
        );
      }
      for (const op of deleteOps) {
        docs.push(toTombstone(stream, { id: op.delete.id, type: op.delete.type }));
      }
      for (const op of restoreOps) {
        // Restore is implemented as a tombstone: the append-only payload
        // of an excluded feature can be stale, so we drop the lineage and
        // let the LLM redrive the feature on the next extraction cycle.
        docs.push(toTombstone(stream, { id: op.restore.id, type: KI_TYPE_FEATURE }));
      }
      return this.dataStreamClient.create({
        refresh: 'wait_for',
        documents: docs as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
      });
    });

    return { applied: totalApplied, skipped: excludeSkipped };
  }

  async deleteIndicators(stream: string): Promise<void> {
    const latest = await this.revisionReader.fetchLatestRevisions(
      inPredicate(STREAM_NAME, [stream]),
      IS_NOT_DELETED
    );
    if (latest.length === 0) {
      return;
    }
    const tombstones = latest.map((doc) => toTombstone(stream, doc));
    await this.dataStreamClient.create({
      refresh: 'wait_for',
      documents: tombstones as Array<StoredKnowledgeIndicator & Record<string, unknown>>,
    });
  }
}
