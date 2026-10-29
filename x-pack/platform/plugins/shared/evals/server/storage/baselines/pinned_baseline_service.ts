/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { AnyIDataStreamClient } from '@kbn/data-streams';
import type { EvaluationScoreDocument, PinnedBaseline } from '@kbn/evals-common';
import { EvaluationIndices, buildSpaceFilter } from '@kbn/evals-common';

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
   * deterministic per (baseline, source doc), so a retried pin does not duplicate scores.
   */
  async pin({
    pointer,
    scores,
    spaceIds,
  }: {
    pointer: Omit<PinnedBaseline, 'pinned_at' | 'score_count' | 'dataset_ids'>;
    scores: Array<{ id: string; document: EvaluationScoreDocument }>;
    spaceIds: string[];
  }): Promise<PinnedBaseline> {
    const pinnedAt = new Date().toISOString();
    const datasetIds = [
      ...new Set(scores.map(({ document }) => document.example.dataset.id)),
    ].sort();

    const pointerDocument: { _id: string } & PinnedBaselinePointerDocument = {
      _id: pointer.baseline_id,
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
        score_count: scores.length,
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

    const scoreDocuments = scores.map(({ id, document }) => ({
      _id: `${pointer.baseline_id}:${id}`,
      ...document,
      doc_kind: 'score' as const,
      baseline: { id: pointer.baseline_id },
    }));

    const client = await this.getClient();
    const response = await client.create({
      documents: [pointerDocument, ...scoreDocuments],
      refresh: 'wait_for',
    });

    const conflicted = response.items.filter((item) => item.create?.status === 409).length;
    if (conflicted > 0) {
      // Already written by a retried pin with the same deterministic IDs.
      this.logger.warn(
        `${conflicted} baseline document(s) for ${pointer.baseline_id} already existed`
      );
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

    return pointerToResponse(pointerDocument);
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
    });

    const hit = response.hits?.hits?.[0];
    if (!hit?._source) {
      return undefined;
    }
    return pointerToResponse(hit._source as unknown as PinnedBaselinePointerDocument);
  }

  async getScores({
    baselineId,
    spaceId,
  }: {
    baselineId: string;
    spaceId?: string;
  }): Promise<EvaluationScoreDocument[]> {
    const must: Array<Record<string, unknown>> = [
      { term: { doc_kind: 'score' } },
      { term: { 'baseline.id': baselineId } },
    ];
    if (spaceId) {
      must.push(buildSpaceFilter(spaceId));
    }

    const client = await this.getClient();
    const response = await client.search({
      query: { bool: { must } },
      sort: [{ '@timestamp': { order: 'asc' } }],
      size: 10000,
    });

    const hits = response.hits?.hits ?? [];
    return hits
      .map((hit) => hit._source)
      .filter((source): source is PinnedBaselineScoreDocument => source !== undefined)
      .map(({ doc_kind: docKind, baseline, ...score }) => score as EvaluationScoreDocument);
  }
}
