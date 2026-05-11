/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EvaluationScoreDocument, IngestScoresRequestBody } from '@kbn/evals-common';
import { EVALUATIONS_DATA_STREAM_NAME } from './scores_index_template';

interface BulkDroppedDocument {
  document: {
    index: number;
    payload: EvaluationScoreDocument;
  };
  status: number;
  error?: {
    type?: string;
    reason?: string;
  };
}

export interface IngestFailure {
  index: number;
  status: number;
  reason: string;
}

export interface WriteResult {
  ingested: number;
  conflicted: number;
  failed: IngestFailure[];
}

const DEFAULT_SUITE_ID = 'unknown-suite';

export const computeScoreDocumentId = (document: EvaluationScoreDocument): string => {
  const suiteId = document.suite?.id ?? DEFAULT_SUITE_ID;
  return [
    document.run_id,
    suiteId,
    document.task.model.id,
    document.example.dataset.id,
    document.example.id,
    document.evaluator.name,
    document.task.repetition_index,
  ].join('-');
};

const toEvaluationScoreDocuments = (
  request: IngestScoresRequestBody,
  timestamp: string
): Array<{ index: number; payload: EvaluationScoreDocument }> => {
  return request.scores.map((score, index) => ({
    index,
    payload: {
      '@timestamp': timestamp,
      run_id: request.run_id,
      experiment_id: request.experiment_id,
      suite: request.suite_id ? { id: request.suite_id } : undefined,
      ci: request.ci,
      example: {
        id: score.example.id,
        index: score.example.index,
        input: score.example.input,
        dataset: score.example.dataset,
      },
      task: {
        trace_id: score.task.trace_id,
        repetition_index: score.task.repetition_index,
        output: score.task.output,
        model: request.task_model,
      },
      evaluator: {
        name: score.evaluator.name,
        score: score.evaluator.score,
        label: score.evaluator.label,
        explanation: score.evaluator.explanation,
        metadata: score.evaluator.metadata,
        trace_id: score.evaluator.trace_id,
        model: request.evaluator_model,
      },
      run_metadata: {
        git_branch: request.run_metadata.git_branch ?? null,
        git_commit_sha: request.run_metadata.git_commit_sha ?? null,
        total_repetitions: request.run_metadata.total_repetitions,
      },
      environment: {
        hostname: request.environment.hostname,
      },
    },
  }));
};

export class EvaluationScoreService {
  constructor(logger: Logger) {
    void logger;
  }

  async write(
    esClient: ElasticsearchClient,
    request: IngestScoresRequestBody
  ): Promise<WriteResult> {
    if (request.scores.length === 0) {
      return { ingested: 0, conflicted: 0, failed: [] };
    }

    const timestamp = new Date().toISOString();
    const documents = toEvaluationScoreDocuments(request, timestamp);
    const droppedDocuments: BulkDroppedDocument[] = [];

    const bulkStats = await esClient.helpers.bulk({
      datasource: documents,
      onDocument: ({ payload }) => [
        {
          create: {
            _index: EVALUATIONS_DATA_STREAM_NAME,
            _id: computeScoreDocumentId(payload),
          },
        },
        payload,
      ],
      onDrop: (document) => {
        droppedDocuments.push(document as BulkDroppedDocument);
      },
      refresh: 'wait_for',
    });

    if (bulkStats.failed === 0) {
      return { ingested: bulkStats.successful, conflicted: 0, failed: [] };
    }

    const conflicted = droppedDocuments.filter(({ status }) => status === 409).length;
    const failed = droppedDocuments
      .filter(({ status }) => status !== 409)
      .map(({ document, status, error }) => ({
        index: document.index,
        status,
        reason: error?.reason ?? error?.type ?? 'unknown failure reason',
      }));

    return {
      ingested: bulkStats.successful,
      conflicted,
      failed,
    };
  }
}
