/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { MlClient } from '../../../lib/ml_client';

const MAX_RECORDS = 20;

export interface SummarizeAnomalyDeps {
  mlClient: MlClient;
  model: ScopedModel;
  signal?: AbortSignal;
}

export interface SummarizeAnomalyParams {
  jobId: string;
  /** Start of the time range of the anomaly, in epoch ms */
  start: number;
  /** End of the time range of the anomaly, in epoch ms */
  end: number;
}

interface AnomalyRecordSource {
  record_score: number;
  timestamp: number;
  detector_index: number;
  function_description?: string;
  field_name?: string;
  partition_field_name?: string;
  partition_field_value?: string;
  by_field_name?: string;
  by_field_value?: string;
  over_field_name?: string;
  over_field_value?: string;
  actual?: number[];
  typical?: number[];
  multi_bucket_impact?: number;
  influencers?: Array<{ influencer_field_name: string; influencer_field_values: string[] }>;
}

export interface AnomalyEvidence {
  job: {
    id: string;
    description?: string;
    bucketSpan: string;
    influencers: string[];
    detectors: Array<{ index: number; description: string }>;
  };
  timeRange: { start: string; end: string };
  /** The highest scoring anomalies in the time range, from the highest score down */
  anomalies: Array<{
    time: string;
    score: number;
    detector: string;
    /** What was measured, for example count or mean, and of which field */
    measure: string;
    entity: Record<string, string>;
    actual?: number[];
    typical?: number[];
    /** How many times the actual value is the typical value, when both are known */
    actualComparedWithTypical?: string;
    influencers: Record<string, string[]>;
  }>;
}

const compareWithTypical = (actual?: number, typical?: number): string | undefined => {
  if (actual === undefined || typical === undefined || actual === typical) return undefined;
  if (typical === 0) return 'typical is 0';
  const ratio = actual / typical;
  if (ratio >= 1) return `${Math.round(ratio * 10) / 10}x higher`;
  return `${Math.round((1 / ratio) * 10) / 10}x lower`;
};

/** Gathers the facts the model is given about an anomaly: the job and the anomalies it found in the time range. */
export const gatherAnomalyEvidence = async (
  mlClient: MlClient,
  { jobId, start, end }: SummarizeAnomalyParams
): Promise<AnomalyEvidence> => {
  const [{ jobs }, results] = await Promise.all([
    mlClient.getJobs({ job_id: jobId }),
    mlClient.anomalySearch(
      {
        size: MAX_RECORDS,
        query: {
          bool: {
            filter: [
              { term: { job_id: jobId } },
              { term: { result_type: 'record' } },
              { range: { timestamp: { gte: start, lt: end, format: 'epoch_millis' } } },
            ],
          },
        },
        sort: [{ record_score: { order: 'desc' } }],
      },
      [jobId]
    ),
  ]);

  const job = jobs[0];
  const detectors = job?.analysis_config.detectors ?? [];
  const describeDetector = (index: number): string =>
    detectors[index]?.detector_description ?? `detector ${index}`;

  const anomalies = results.hits.hits.flatMap(({ _source }) => {
    const record = _source as unknown as AnomalyRecordSource | undefined;
    if (!record) return [];

    const entity: Record<string, string> = {};
    [
      [record.partition_field_name, record.partition_field_value],
      [record.by_field_name, record.by_field_value],
      [record.over_field_name, record.over_field_value],
    ].forEach(([name, value]) => {
      if (name !== undefined && value !== undefined) entity[name] = value;
    });

    return [
      {
        time: new Date(record.timestamp).toISOString(),
        score: Math.round(record.record_score * 10) / 10,
        detector: describeDetector(record.detector_index),
        measure: [record.function_description, record.field_name].filter(Boolean).join(' of '),
        entity,
        actual: record.actual,
        typical: record.typical,
        actualComparedWithTypical: compareWithTypical(record.actual?.[0], record.typical?.[0]),
        influencers: Object.fromEntries(
          (record.influencers ?? []).map(
            ({ influencer_field_name: name, influencer_field_values: values }) => [name, values]
          )
        ),
      },
    ];
  });

  return {
    job: {
      id: jobId,
      description: job?.description,
      bucketSpan: String(job?.analysis_config.bucket_span ?? ''),
      influencers: job?.analysis_config.influencers ?? [],
      detectors: detectors.map((_, index) => ({ index, description: describeDetector(index) })),
    },
    timeRange: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
    anomalies,
  };
};

export const createSummaryPrompt = (
  evidence: AnomalyEvidence
): Array<[role: 'system' | 'user', content: string]> => [
  [
    'system',
    `You are an expert in Elastic machine learning anomaly detection. You are given facts about an anomaly: the job
which found it and its description, its detectors, the anomalies found in the time range with their scores, the actual
and typical values, and their influencers.
Explain why this is an anomaly, in a very brief description of two or three short plain language sentences, at most
60 words. Compare the actual value with the typical value, giving both and how many times higher or lower the actual
value is, for the entity it was found for. Use the job description to explain why this behaviour is unusual or what it
may mean. Mention the most important influencers. Use only the facts given and do not invent causes. Do not use
Markdown or headings, and do not repeat the job id.`,
  ],
  ['user', JSON.stringify(evidence, null, 2)],
];

const textOf = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) =>
      typeof part === 'string' ? part : typeof part?.text === 'string' ? part.text : ''
    )
    .join('');
};

/** Asks the model for a very brief description of the anomalies of a job in a time range. */
export const summarizeAnomaly = async (
  { mlClient, model, signal }: SummarizeAnomalyDeps,
  params: SummarizeAnomalyParams
): Promise<string> => {
  const evidence = await gatherAnomalyEvidence(mlClient, params);
  const response = await model.chatModel.invoke(createSummaryPrompt(evidence), { signal });
  return textOf(response.content).trim();
};
