/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import {
  SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
  SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import type { OtelQueryCandidate } from './generate_otel_queries';

const BATCH_SIZE = 200;
const SYSTEM = `Classify deterministic typed OpenTelemetry queries. For each id return a concise title, one-sentence description, severity_score from 0-100, and keep. Keep every useful query tier. Set keep=false only for an exact duplicate or a meaningless item. Never invent or alter ES|QL.`;
const schema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity_score: { type: 'number' },
          keep: { type: 'boolean' },
        },
        required: ['id', 'title', 'description', 'severity_score', 'keep'],
      },
    },
  },
  required: ['results'],
} as const;

/** Names and scores deterministic OTel queries; inference failure keeps every query. */
export async function classifyOtelSignals({
  inferenceClient,
  connectorId,
  candidates,
  logger,
  abortSignal,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  candidates: OtelQueryCandidate[];
  logger: Logger;
  abortSignal?: AbortSignal;
}): Promise<OtelQueryCandidate[]> {
  const decisions = new Map<
    number,
    { title?: string; description?: string; severity_score?: number; keep?: boolean }
  >();

  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const batch = candidates.slice(start, start + BATCH_SIZE);
    const input = batch
      .map(
        ({ tier, field, query, source }, offset) =>
          `${start + offset}\tservice=${
            query.title.split(':')[0]
          }\ttier=${tier}\tfield=${field}\tsource=${source.file}:${source.line}\tesql=${
            query.esql.query
          }`
      )
      .join('\n');
    try {
      const { output } = await inferenceClient.output({
        id: 'classify_otel_signals',
        connectorId,
        system: SYSTEM,
        input,
        schema,
        abortSignal,
        metadata: {
          connectorTelemetry: {
            pluginId: SIGNIFICANT_EVENTS_OTEL_SIGNALS_INFERENCE_FEATURE_ID,
            aggregateBy: SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID,
          },
        },
      });
      for (const result of output?.results ?? []) {
        if (typeof result.id === 'number') decisions.set(result.id, result);
      }
    } catch (error) {
      logger.warn(
        `classify_otel_signals: inference failed, keeping deterministic queries (${
          error instanceof Error ? error.message : String(error)
        })`
      );
    }
  }

  return candidates.flatMap((candidate, id) => {
    const decision = decisions.get(id);
    if (decision?.keep === false) return [];
    const score = decision?.severity_score;
    return [
      {
        ...candidate,
        query: {
          ...candidate.query,
          title: decision?.title?.trim() || candidate.query.title,
          description: decision?.description?.trim() || candidate.query.description,
          severity_score:
            typeof score === 'number' && score >= 0 && score <= 100
              ? score
              : candidate.query.severity_score,
        },
      },
    ];
  });
}
