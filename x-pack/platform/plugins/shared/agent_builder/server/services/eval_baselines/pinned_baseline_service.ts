/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'crypto';
import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { AnyIDataStreamClient } from '@kbn/data-streams';
import type { EvaluationScoreDocument, PinnedBaseline } from '@kbn/evals-common';
import { EvaluationIndices, MAX_PINNABLE_SCORES, buildSpaceFilter } from '@kbn/evals-common';
import { assertExpectedScoreCount } from './errors';

/** A snapshotted score document: the original score plus its baseline attribution. */
export type PinnedBaselineScoreDocument = EvaluationScoreDocument & {
  doc_kind: 'score';
  baseline: { id: string };
};

interface PinnedBaselinePointerDocument {
  '@timestamp': string;
  doc_kind: 'pointer';
  space_ids: string[];
  baseline: {
    id: string;
    suite_id: string;
    execution_id: string;
    judge_model_id?: string | null;
    pinned_at: string;
    pinned_by?: string | null;
    reason?: string | null;
    score_count: number;
    dataset_ids: string[];
  };
  task: { model?: PinnedBaseline['task_model'] };
  metadata: {
    git?: { branch?: string | null; commit_sha?: string | null };
  };
}

// A snapshot bulk request carries at most this many documents, matching the cap score
// ingestion puts on one request, so a 10k-score pin doesn't go out as a single huge bulk.
const BULK_WRITE_CHUNK_SIZE = 1000;

// The source score ID is always hashed: it keeps the combined ID under Elasticsearch's
// 512-byte cap whatever the source ID looks like, stays deterministic per source doc (so
// retried pins target the same IDs), and a single form leaves no literal/hashed namespace
// seam where two distinct scores could collide on one snapshot ID.
const snapshotDocumentId = (baselineId: string, scoreId: string): string =>
  `${baselineId}:${createHash('sha256').update(scoreId).digest('hex')}`;

// One pointer document per pin, not per baseline: a re-pin publishes a fresh pointer over
// the stored snapshot, and the reads select the newest one, so re-pinning execution A
// after a bad pin of B makes A the latest baseline again. The `pointer` segment cannot
// collide with snapshot score IDs, whose suffix is always a hex digest.
//
// The first pin's pointer ID is deterministic (write-once): racing first pins conflict on
// it instead of publishing competing pointers with different score counts, and the loser
// returns the stored pointer. Each promotion gets a unique ID, so concurrent promotions
// never silently drop one request's attribution.
const firstPointerDocumentId = (baselineId: string): string => `${baselineId}:pointer`;
const promotionPointerDocumentId = (baselineId: string): string =>
  `${baselineId}:pointer:${randomUUID()}`;

const pointerToResponse = (doc: PinnedBaselinePointerDocument): PinnedBaseline => ({
  baseline_id: doc.baseline.id,
  suite_id: doc.baseline.suite_id,
  execution_id: doc.baseline.execution_id,
  task_model: doc.task.model ?? undefined,
  judge_model_id: doc.baseline.judge_model_id ?? null,
  git_branch: doc.metadata.git?.branch ?? null,
  git_commit_sha: doc.metadata.git?.commit_sha ?? null,
  pinned_at: doc.baseline.pinned_at,
  pinned_by: doc.baseline.pinned_by ?? null,
  reason: doc.baseline.reason ?? null,
  score_count: doc.baseline.score_count,
  dataset_ids: doc.baseline.dataset_ids,
});

export class PinnedBaselineService {
  constructor(
    private readonly logger: Logger,
    private readonly coreDataStreams: DataStreamsStart
  ) {}

  private async getClient(): Promise<AnyIDataStreamClient> {
    return this.coreDataStreams.initializeClient(EvaluationIndices.PINNED_BASELINES);
  }

  /**
   * Writes the pointer and the snapshotted score documents for one pin. Document IDs are
   * deterministic per (baseline, source doc), so a retried pin does not duplicate scores,
   * and a pin of an already-pinned baseline re-promotes its stored snapshot.
   */
  async pin({
    pointer,
    scores,
    spaceIds,
    expectedScoreCount,
  }: {
    pointer: Omit<PinnedBaseline, 'pinned_at' | 'score_count' | 'dataset_ids'>;
    scores: Array<{ id: string; document: EvaluationScoreDocument }>;
    spaceIds: string[];
    expectedScoreCount?: number | null;
  }): Promise<PinnedBaseline> {
    const client = await this.getClient();

    // The snapshot of a published baseline is immutable, but a re-pin is not a no-op: it
    // publishes a fresh pointer over the stored snapshot, so re-pinning execution A after
    // a bad pin of B promotes A back to the latest baseline without the snapshot (or its
    // recorded count and judge metadata) ever changing.
    const existingPointer = await this.findPointerById(client, pointer.baseline_id);
    if (existingPointer) {
      assertExpectedScoreCount({
        baselineId: pointer.baseline_id,
        actualCount: existingPointer.baseline.score_count,
        expectedCount: expectedScoreCount,
        stored: true,
      });
      this.logger.info(
        `Baseline ${pointer.baseline_id} is already pinned; promoting its existing snapshot.`
      );
      return this.publishPointer(client, existingPointer, {
        pinnedBy: pointer.pinned_by ?? null,
        reason: pointer.reason ?? null,
      });
    }

    // The source stream can serve the same score twice (e.g. a re-ingest duplicated it
    // across backing indices after a rollover). Both copies map to one snapshot ID, so
    // counting them separately would publish a score_count no read could ever satisfy.
    const uniqueScores = [...new Map(scores.map((score) => [score.id, score])).values()];

    assertExpectedScoreCount({
      baselineId: pointer.baseline_id,
      actualCount: uniqueScores.length,
      expectedCount: expectedScoreCount,
      stored: false,
    });

    const pinnedAt = new Date().toISOString();
    const datasetIds = [
      ...new Set(uniqueScores.map(({ document }) => document.example.dataset.id)),
    ].sort();

    const pointerDocument: { _id: string } & PinnedBaselinePointerDocument = {
      _id: firstPointerDocumentId(pointer.baseline_id),
      '@timestamp': pinnedAt,
      doc_kind: 'pointer',
      space_ids: spaceIds,
      baseline: {
        id: pointer.baseline_id,
        suite_id: pointer.suite_id,
        execution_id: pointer.execution_id,
        judge_model_id: pointer.judge_model_id ?? null,
        pinned_at: pinnedAt,
        pinned_by: pointer.pinned_by ?? null,
        reason: pointer.reason ?? null,
        score_count: uniqueScores.length,
        dataset_ids: datasetIds,
      },
      task: { model: pointer.task_model },
      metadata: {
        git: {
          branch: pointer.git_branch ?? null,
          commit_sha: pointer.git_commit_sha ?? null,
        },
      },
    };

    const scoreDocuments = uniqueScores.map(({ id, document }) => ({
      _id: snapshotDocumentId(pointer.baseline_id, id),
      ...document,
      // The snapshot is visible where the pin is: source scores shared into other spaces
      // must not make their snapshot copies readable from spaces the pin was never in.
      space_ids: spaceIds,
      doc_kind: 'score' as const,
      baseline: { id: pointer.baseline_id },
    }));

    // Bulk writes are not atomic, and `findLatest` selects whatever pointer exists: write
    // the snapshot first and publish the pointer only once every score landed, so a
    // partially-written pin never becomes the active baseline. The batch waits for one
    // refresh (on its last chunk): a losing concurrent pin's read-back below must be able
    // to see these documents, and a pointer-write conflict has nothing of its own to wait
    // on when every item conflicts.
    if (scoreDocuments.length > 0) {
      await this.createDocuments(client, scoreDocuments, pointer.baseline_id, 'wait_for');
    }
    const conflicts = await this.createDocuments(
      client,
      [pointerDocument],
      pointer.baseline_id,
      'wait_for'
    );
    if (conflicts > 0) {
      // A concurrent first pin won the write-once pointer: its view of the snapshot is
      // the published one, so answer with what is stored rather than this request's —
      // and hold the caller's expected count against the winner, which may have
      // snapshotted a different set of scores than the ones this request validated.
      const storedPointer = await this.findPointerById(client, pointer.baseline_id);
      if (storedPointer) {
        assertExpectedScoreCount({
          baselineId: pointer.baseline_id,
          actualCount: storedPointer.baseline.score_count,
          expectedCount: expectedScoreCount,
          stored: true,
        });
        // This losing attempt may have written score documents the winner never counted
        // (the attempts read the live scores at different moments). getScores throws on
        // a snapshot whose document count disagrees with its pointer, so reading the
        // winner's snapshot back fails this pin loudly instead of answering success
        // with a baseline no comparison will be able to read.
        await this.getScores({ baselineId: pointer.baseline_id, spaceId: spaceIds[0] });
        return pointerToResponse(storedPointer);
      }
    }

    return pointerToResponse(pointerDocument);
  }

  /**
   * Promotes an already-pinned baseline back to the latest pin by publishing a fresh
   * pointer over its stored snapshot — the rollback path, which must keep working even
   * after the source scores aged out of the evals stream.
   */
  async repin({
    baselineId,
    pinnedBy,
    reason,
    expectedScoreCount,
  }: {
    baselineId: string;
    pinnedBy: string | null;
    reason: string | null;
    expectedScoreCount?: number | null;
  }): Promise<PinnedBaseline | undefined> {
    const client = await this.getClient();
    const existingPointer = await this.findPointerById(client, baselineId);
    if (!existingPointer) {
      return undefined;
    }
    assertExpectedScoreCount({
      baselineId,
      actualCount: existingPointer.baseline.score_count,
      expectedCount: expectedScoreCount,
      stored: true,
    });
    return this.publishPointer(client, existingPointer, { pinnedBy, reason });
  }

  private async publishPointer(
    client: AnyIDataStreamClient,
    existing: PinnedBaselinePointerDocument,
    { pinnedBy, reason }: { pinnedBy: string | null; reason: string | null }
  ): Promise<PinnedBaseline> {
    const pinnedAt = new Date().toISOString();
    const pointerDocument: { _id: string } & PinnedBaselinePointerDocument = {
      ...existing,
      _id: promotionPointerDocumentId(existing.baseline.id),
      '@timestamp': pinnedAt,
      baseline: {
        ...existing.baseline,
        pinned_at: pinnedAt,
        pinned_by: pinnedBy,
        reason,
      },
    };
    await this.createDocuments(client, [pointerDocument], existing.baseline.id, 'wait_for');
    return pointerToResponse(pointerDocument);
  }

  private async findPointerById(
    client: AnyIDataStreamClient,
    baselineId: string
  ): Promise<PinnedBaselinePointerDocument | undefined> {
    const response = await client.search({
      query: {
        bool: {
          must: [{ term: { doc_kind: 'pointer' } }, { term: { 'baseline.id': baselineId } }],
        },
      },
      // A re-pinned baseline has one pointer per pin; its snapshot metadata is identical
      // on all of them, and the newest carries the latest pinned_at/pinned_by/reason.
      sort: [{ 'baseline.pinned_at': { order: 'desc' } }],
      size: 1,
      allow_partial_search_results: false,
    });
    const source = response.hits?.hits?.[0]?._source;
    return source ? (source as unknown as PinnedBaselinePointerDocument) : undefined;
  }

  /** Returns the number of documents that already existed (409), for the caller to judge. */
  private async createDocuments<T extends { _id: string }>(
    client: AnyIDataStreamClient,
    documents: T[],
    baselineId: string,
    refresh: false | 'wait_for'
  ): Promise<number> {
    let totalConflicted = 0;
    for (let offset = 0; offset < documents.length; offset += BULK_WRITE_CHUNK_SIZE) {
      // A refresh makes everything indexed before it searchable, so honoring the
      // requested refresh on the last chunk alone gives the whole batch visibility
      // without serializing every chunk over a refresh interval.
      const isLastChunk = offset + BULK_WRITE_CHUNK_SIZE >= documents.length;
      const response = await client.create({
        documents: documents.slice(offset, offset + BULK_WRITE_CHUNK_SIZE),
        refresh: isLastChunk ? refresh : false,
      });

      const conflicted = response.items.filter((item) => item.create?.status === 409).length;
      if (conflicted > 0) {
        // Already written by a retried pin with the same deterministic IDs.
        this.logger.warn(`${conflicted} baseline document(s) for ${baselineId} already existed`);
        totalConflicted += conflicted;
      }
      const failures = response.items.filter((item) => {
        const status = item.create?.status;
        return !status || (status !== 409 && (status < 200 || status >= 300));
      });
      if (failures.length > 0) {
        const reason =
          failures[0].create?.error?.reason ?? failures[0].create?.error?.type ?? 'unknown';
        throw new Error(`Failed to write ${failures.length} baseline document(s): ${reason}`);
      }
    }
    return totalConflicted;
  }

  async findLatest({
    suiteId,
    modelId,
    spaceId,
  }: {
    suiteId: string;
    modelId?: string;
    spaceId?: string;
  }): Promise<PinnedBaseline | undefined> {
    const must: Array<Record<string, unknown>> = [
      { term: { doc_kind: 'pointer' } },
      { term: { 'baseline.suite_id': suiteId } },
    ];
    if (modelId) {
      must.push({ term: { 'task.model.id': modelId } });
    }
    if (spaceId) {
      must.push(buildSpaceFilter(spaceId));
    }

    const client = await this.getClient();
    const response = await client.search({
      query: { bool: { must } },
      sort: [{ 'baseline.pinned_at': { order: 'desc' } }],
      size: 1,
      // A failed shard must not silently resolve an older pointer as the active baseline.
      allow_partial_search_results: false,
    });

    const hit = response.hits?.hits?.[0];
    if (!hit?._source) {
      return undefined;
    }
    return pointerToResponse(hit._source as unknown as PinnedBaselinePointerDocument);
  }

  /**
   * The snapshotted scores of one baseline, or undefined when no pointer for it is
   * visible to the caller — an unknown id (or a pin from a space the caller can't see)
   * must be distinguishable from a pinned-but-empty baseline.
   */
  async getScores({
    baselineId,
    spaceId,
  }: {
    baselineId: string;
    spaceId?: string;
  }): Promise<EvaluationScoreDocument[] | undefined> {
    const pointerMust: Array<Record<string, unknown>> = [
      { term: { doc_kind: 'pointer' } },
      { term: { 'baseline.id': baselineId } },
    ];
    const scoresMust: Array<Record<string, unknown>> = [
      { term: { doc_kind: 'score' } },
      { term: { 'baseline.id': baselineId } },
    ];
    if (spaceId) {
      pointerMust.push(buildSpaceFilter(spaceId));
      scoresMust.push(buildSpaceFilter(spaceId));
    }

    const client = await this.getClient();

    const pointerResponse = await client.search({
      query: { bool: { must: pointerMust } },
      sort: [{ 'baseline.pinned_at': { order: 'desc' } }],
      size: 1,
      allow_partial_search_results: false,
    });
    const pointerSource = pointerResponse.hits?.hits?.[0]?._source as
      | PinnedBaselinePointerDocument
      | undefined;
    if (!pointerSource) {
      return undefined;
    }

    const response = await client.search({
      query: { bool: { must: scoresMust } },
      sort: [{ '@timestamp': { order: 'asc' } }],
      size: MAX_PINNABLE_SCORES,
      // A failed shard must not silently shrink the baseline the comparison runs on.
      allow_partial_search_results: false,
    });

    const hits = response.hits?.hits ?? [];
    const scores = hits
      .map((hit) => hit._source)
      .filter((source): source is PinnedBaselineScoreDocument => source !== undefined)
      .map(({ doc_kind: docKind, baseline, ...score }) => score as EvaluationScoreDocument);

    // The pointer records how many scores its snapshot holds; a comparison must fail
    // explicitly on a drifted snapshot (e.g. early chunks aged out of a rolled-over
    // backing index) rather than quietly run against a different set of scores.
    const expectedCount = pointerSource.baseline.score_count;
    if (scores.length !== expectedCount) {
      throw new Error(
        `Pinned baseline "${baselineId}" snapshot is incomplete: its pointer records ` +
          `${expectedCount} score(s) but ${scores.length} are readable. Pin a different ` +
          `execution to replace it.`
      );
    }

    return scores;
  }
}
