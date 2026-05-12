/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { AnyIDataStreamClient, ClientSearchRequest } from '@kbn/data-streams';
import type { EvaluationScoreDocument, IngestScoresRequestBody } from '@kbn/evals-common';
import { EVALUATIONS_DATA_STREAM_NAME } from './scores_index_template';

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
type DataStreamSearchResponse = Awaited<ReturnType<AnyIDataStreamClient['search']>>;

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
): Array<{ _id: string } & EvaluationScoreDocument> => {
  return request.scores.map((score) => {
    const payload: EvaluationScoreDocument = {
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
    };

    return {
      _id: computeScoreDocumentId(payload),
      ...payload,
    };
  });
};

export class EvaluationScoreService {
  constructor(logger: Logger, private readonly coreDataStreams: DataStreamsStart) {
    void logger;
  }

  private async getClient(): Promise<AnyIDataStreamClient> {
    return this.coreDataStreams.initializeClient(EVALUATIONS_DATA_STREAM_NAME);
  }

  public async search(request: ClientSearchRequest): Promise<DataStreamSearchResponse> {
    const client = await this.getClient();
    return client.search(request);
  }

  async write(request: IngestScoresRequestBody): Promise<WriteResult> {
    if (request.scores.length === 0) {
      return { ingested: 0, conflicted: 0, failed: [] };
    }

    const timestamp = new Date().toISOString();
    const documents = toEvaluationScoreDocuments(request, timestamp);
    const client = await this.getClient();
    const response = await client.create({
      documents,
      refresh: 'wait_for',
    });

    let conflicted = 0;
    const failed: IngestFailure[] = [];

    response.items.forEach((item, index) => {
      const createItem = item.create;
      const status = createItem?.status;
      if (!status) {
        failed.push({
          index,
          status: 500,
          reason: 'unknown failure reason',
        });
        return;
      }

      if (status === 409) {
        conflicted += 1;
        return;
      }

      if (status < 200 || status >= 300) {
        failed.push({
          index,
          status,
          reason: createItem.error?.reason ?? createItem.error?.type ?? 'unknown failure reason',
        });
      }
    });

    return {
      ingested: documents.length - conflicted - failed.length,
      conflicted,
      failed,
    };
  }
}
