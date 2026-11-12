/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { DatasetName } from '../config';
import { datasetDirOf } from '../config';
import type { StageContext } from '../context';
import { readJson, writeJson } from '../download';
import type { SpanDocument } from '../otel_spans';
import { roundToSpans, traceIdOf } from '../otel_spans';
import type { ExtractedDataset, ImportManifest } from '../types';
import { datasetsOf, extractedFileOf } from './extract';

const BULK_BATCH = 500;
const DELETE_BATCH = 1000;

export const importManifestFileOf = (dir: string): string => path.join(dir, 'import.json');

export const readImportManifest = (
  context: StageContext,
  dataset: DatasetName
): ImportManifest | undefined => {
  const file = importManifestFileOf(datasetDirOf(context.config, dataset));
  return fs.existsSync(file) ? readJson<ImportManifest>(file) : undefined;
};

/** Every span of a dataset's rounds, and the trace ids they belong to. */
export const spansOf = ({
  dataset,
  agent,
  conversations,
}: ExtractedDataset): { spans: SpanDocument[]; traceIds: string[] } => {
  const spans: SpanDocument[] = [];
  const traceIds: string[] = [];
  for (const conversation of conversations) {
    conversation.rounds.forEach((_, roundIndex) => {
      traceIds.push(traceIdOf(dataset, conversation.id, roundIndex));
      spans.push(...roundToSpans({ dataset, agent, conversation, roundIndex }));
    });
  }
  return { spans, traceIds };
};

const deleteTraces = async (esClient: Client, index: string, traceIds: string[]) => {
  let deleted = 0;
  for (let start = 0; start < traceIds.length; start += DELETE_BATCH) {
    const response = await esClient.deleteByQuery(
      {
        index,
        query: { terms: { trace_id: traceIds.slice(start, start + DELETE_BATCH) } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
        allow_no_indices: true,
      },
      { ignore: [404] }
    );
    deleted += response.deleted ?? 0;
  }
  return deleted;
};

const bulkCreate = async (esClient: Client, index: string, spans: SpanDocument[]) => {
  for (let start = 0; start < spans.length; start += BULK_BATCH) {
    const batch = spans.slice(start, start + BULK_BATCH);
    const response = await esClient.bulk({
      refresh: start + BULK_BATCH >= spans.length ? 'wait_for' : false,
      operations: batch.flatMap((span) => [{ create: { _index: index } }, span]),
    });
    if (response.errors) {
      const failed = response.items.find((item) => item.create?.error)?.create?.error;
      throw new Error(`Writing spans to ${index} failed: ${JSON.stringify(failed)}`);
    }
  }
};

export const readExtracted = (context: StageContext, dataset: DatasetName): ExtractedDataset => {
  const file = extractedFileOf(datasetDirOf(context.config, dataset));
  if (!fs.existsSync(file)) {
    throw new Error(`${dataset} is not extracted yet: run the extract stage first`);
  }
  return readJson<ExtractedDataset>(file);
};

/**
 * Replaces the spans of a dataset with those of its conversations, or of only `conversationIds`,
 * and records what is imported.
 */
export const writeDatasetSpans = async (
  context: StageContext,
  extracted: ExtractedDataset,
  conversationIds?: string[]
): Promise<ImportManifest> => {
  const { config, esClient, log } = context;
  const index = config.tracesIndex;
  const dataset = extracted.dataset as DatasetName;
  const wanted = conversationIds && new Set(conversationIds);
  const { spans, traceIds } = spansOf({
    ...extracted,
    conversations: extracted.conversations.filter(({ id }) => !wanted || wanted.has(id)),
  });

  const previous = readImportManifest(context, dataset);
  const stale = [...new Set([...(previous?.traceIds ?? []), ...spansOf(extracted).traceIds])];
  const deleted = await deleteTraces(esClient, previous?.index ?? index, stale);
  log.debug(`${dataset}: deleted ${deleted} spans of an earlier import`);
  await bulkCreate(esClient, index, spans);

  const times = extracted.conversations
    .filter(({ id }) => !wanted || wanted.has(id))
    .flatMap(({ rounds }) => rounds.map(({ startedAt }) => startedAt))
    .sort();
  const manifest: ImportManifest = {
    dataset,
    index,
    agentId: extracted.agent.id,
    traceIds,
    rounds: traceIds.length,
    spans: spans.length,
    earliest: times[0],
    latest: times[times.length - 1],
    importedAt: new Date().toISOString(),
  };
  writeJson(importManifestFileOf(datasetDirOf(config, dataset)), manifest);
  return manifest;
};

/** Whether a dataset's samples run one at a time, each with only its own conversations. */
export const isPerSample = (context: StageContext, dataset: DatasetName): boolean =>
  context.config.datasets[dataset].per_sample;

export const runImport = async (context: StageContext): Promise<void> => {
  for (const dataset of datasetsOf(context)) {
    if (isPerSample(context, dataset)) {
      context.log.info(
        `${dataset}: samples run one at a time (per_sample), so the run stage imports each sample's conversations before it dreams on them`
      );
      continue;
    }
    const manifest = await writeDatasetSpans(context, readExtracted(context, dataset));
    context.log.success(
      `${dataset}: wrote ${manifest.spans} spans of ${manifest.rounds} rounds to ${manifest.index} (${manifest.earliest} to ${manifest.latest})`
    );
  }
};
