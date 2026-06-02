/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from './score_documents';

interface BulkCreateAction {
  create: {
    _index: string;
    _id: string;
  };
}

interface BulkCreateResult {
  status: number;
  error?: {
    reason?: string;
  };
}

interface BulkResponseItem {
  create?: BulkCreateResult;
}

export interface ScoreExporterClient {
  bulk: (params: {
    index?: string;
    operations: Array<BulkCreateAction | EvaluationScoreDocument>;
    refresh?: boolean | 'wait_for';
  }) => Promise<{ errors?: boolean; items?: BulkResponseItem[] }>;
}

export interface ExportEvaluationScoresOptions {
  /**
   * Destination index or data stream (defaults to `kibana-evaluations`).
   */
  index?: string;

  /**
   * Whether to request a refresh after export.
   */
  refresh?: boolean | 'wait_for';
}

function getDocumentSuiteId(doc: EvaluationScoreDocument): string {
  return doc.suite?.id ?? 'unknown-suite';
}

export function buildEvaluationScoreDocumentId(doc: EvaluationScoreDocument): string {
  const suiteIdPart = getDocumentSuiteId(doc);
  return [
    doc.run_id,
    suiteIdPart,
    doc.task.model.id,
    doc.example.dataset.id,
    doc.example.id,
    doc.evaluator.name,
    doc.task.repetition_index,
  ].join('-');
}

export async function exportEvaluationScoreDocuments(
  esClient: ScoreExporterClient,
  documents: EvaluationScoreDocument[],
  options: ExportEvaluationScoresOptions = {}
): Promise<{
  attempted: number;
  created: number;
  conflicts: number;
}> {
  if (documents.length === 0) {
    return { attempted: 0, created: 0, conflicts: 0 };
  }

  const targetIndex = options.index ?? 'kibana-evaluations';
  const operations = documents.flatMap((doc) => [
    {
      create: {
        _index: targetIndex,
        _id: buildEvaluationScoreDocumentId(doc),
      },
    },
    doc,
  ]);

  const response = await esClient.bulk({
    operations,
    refresh: options.refresh ?? 'wait_for',
  });

  const items = response.items ?? [];
  let conflicts = 0;
  let created = 0;

  for (const item of items) {
    const create = item.create;
    if (!create) continue;
    if (create.status === 409) {
      conflicts += 1;
    } else if (create.status >= 200 && create.status < 300) {
      created += 1;
    }
  }

  // If ES reports errors, but they're all conflicts, treat as success.
  if (response.errors) {
    const nonConflictErrors = items.filter((i) => i.create?.error && i.create?.status !== 409);
    if (nonConflictErrors.length > 0) {
      const first = nonConflictErrors[0]?.create?.error;
      const reason = first?.reason ? String(first.reason) : 'Unknown bulk error';
      throw new Error(`Failed to export evaluation scores: ${reason}`);
    }
  }

  return { attempted: documents.length, created, conflicts };
}
