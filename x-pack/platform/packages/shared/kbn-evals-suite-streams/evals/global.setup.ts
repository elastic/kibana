/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { globalSetupHookWithSynthtrace } from '@kbn/scout-synthtrace';
import { tags } from '@kbn/scout';
import { PIPELINE_SUGGESTION_DATASETS } from './pipeline_suggestion/pipeline_suggestion_datasets';
import { indexSynthtraceScenario } from './synthtrace_helpers';

/** Must match `sample_logs` scenario `range.interval('5s')` in kbn-synthtrace. */
const SAMPLE_LOGS_STEP_MS = 5000;

const indexModeExamples = PIPELINE_SUGGESTION_DATASETS.flatMap((dataset) =>
  dataset.examples.filter(
    (example) => !example.input.sample_documents || example.input.sample_documents.length === 0
  )
);

function getSynthtraceUsableSpanMs(fromMs: number, toMs: number): number {
  let stepCount = 0;
  for (let t = fromMs; t < toMs; t += SAMPLE_LOGS_STEP_MS) {
    stepCount++;
  }
  if (stepCount < 2) {
    throw new Error(
      `Synthtrace window too short: need at least two ${SAMPLE_LOGS_STEP_MS}ms steps (from=${fromMs}, to=${toMs})`
    );
  }
  return (stepCount - 1) * SAMPLE_LOGS_STEP_MS;
}

/**
 * Per-stream document budget for LogHub + synthtrace: each system gets ~rpm/systemCount effective rpm
 * under uniform distribution, so scale total rpm by system count.
 */
function computeTotalRpmForSampleCount(params: {
  maxSampleCount: number;
  systemCount: number;
  fromMs: number;
  toMs: number;
}): number {
  const { maxSampleCount, systemCount, fromMs, toMs } = params;
  const usableSpanMs = getSynthtraceUsableSpanMs(fromMs, toMs);
  const margin = 1.25;
  return Math.ceil((maxSampleCount * margin * 60_000 * systemCount) / usableSpanMs);
}

globalSetupHookWithSynthtrace(
  'Streams eval setup',
  { tag: tags.stateful.classic },
  async ({ apiServices, config, log, esClient }) => {
    log.info('[streams eval setup] enabling streams');
    await apiServices.streams.enable();

    // Dissect/grok pattern extraction (and other routes under logs.otel) need streams enabled,
    // but not the fork + synthtrace path below—that is only for index-mode pipeline examples.
    if (indexModeExamples.length === 0) {
      log.info('[streams eval setup] no index-mode pipeline examples; skipping fork/synthtrace');
      return;
    }

    log.info('[streams eval setup] forking child streams and indexing synthtrace data');

    // Clean up child streams from previous runs so forks don't 409
    await apiServices.streams.clearStreamChildren('logs.otel');

    for (const example of indexModeExamples) {
      await apiServices.streams.forkStream('logs.otel', example.input.stream_name, {
        field: 'attributes.filepath',
        eq: `${example.input.system}.log`,
      });
    }

    const allSystems = indexModeExamples.map((e) => e.input.system).join(',');
    const from = kbnDatemath.parse('now-5m')!;
    const to = kbnDatemath.parse('now')!;

    const sampleCounts = indexModeExamples
      .map((e) => e.input.sample_document_count)
      .filter((n): n is number => typeof n === 'number' && n > 0);

    if (sampleCounts.length === 0) {
      throw new Error('[streams eval setup] index-mode examples must set sample_document_count');
    }

    const maxSampleCount = Math.max(...sampleCounts);
    const systemCount = indexModeExamples.length;
    const rpm = computeTotalRpmForSampleCount({
      maxSampleCount,
      systemCount,
      fromMs: from.valueOf(),
      toMs: to.valueOf(),
    });

    log.info(
      `[streams eval setup] synthtrace sample_logs: maxSampleCount=${maxSampleCount}, systems=${systemCount}, rpm=${rpm}, uniform_interval layout`
    );

    await indexSynthtraceScenario({
      scenario: 'sample_logs',
      scenarioOpts: {
        systems: allSystems,
        rpm,
        streamType: 'wired',
        loghubTimestampLayout: 'uniform_interval',
      },
      config,
      from,
      to,
    });

    for (const example of indexModeExamples) {
      const needed = example.input.sample_document_count;
      if (!needed) {
        continue;
      }

      await esClient.indices.refresh({ index: example.input.stream_name });
      const { count } = await esClient.count({ index: example.input.stream_name });

      if (count < needed) {
        throw new Error(
          `[streams eval setup] stream ${example.input.stream_name} has ${count} documents; ` +
            `need at least ${needed} (sample_document_count). Increase rpm margin or time window.`
        );
      }

      log.info(
        `[streams eval setup] ${example.input.stream_name}: ${count} documents (>= ${needed})`
      );
    }

    log.info('[streams eval setup] done');
  }
);
