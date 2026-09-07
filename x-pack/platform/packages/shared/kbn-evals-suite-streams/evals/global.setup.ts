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

const PARTITIONING_EVAL_SYSTEMS = ['Hadoop', 'Proxifier', 'Android', 'OpenStack'] as const;
const PARTITIONING_HOMOG_SYSTEMS = ['Linux'] as const;
const PARTITIONING_HARD_SYSTEMS = ['Hadoop', 'Mac', 'Linux', 'HPC'] as const;
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

    log.info('[streams eval setup] forking child streams and indexing synthtrace data');

    // Clean up child streams from previous runs so forks don't 409
    await apiServices.streams.clearStreamChildren('logs.otel');

    // Fork child streams for index-mode pipeline suggestion examples
    for (const example of indexModeExamples) {
      await apiServices.streams.forkStream('logs.otel', example.input.stream_name, {
        field: 'attributes.filepath',
        eq: `${example.input.system}.log`,
      });
    }

    // Fork child stream for partitioning evaluation: diverse systems
    await apiServices.streams.forkStream('logs.otel', 'logs.otel.partition-eval', {
      or: PARTITIONING_EVAL_SYSTEMS.map((system) => ({
        field: 'attributes.filepath',
        eq: `${system}.log`,
      })),
    });

    // Fork child stream for partitioning evaluation: homogeneous data
    await apiServices.streams.forkStream('logs.otel', 'logs.otel.partition-homog', {
      field: 'attributes.filepath',
      eq: `${PARTITIONING_HOMOG_SYSTEMS[0]}.log`,
    });

    // Fork child stream for partitioning evaluation: overlapping metadata (hard)
    await apiServices.streams.forkStream('logs.otel', 'logs.otel.partition-hard', {
      or: PARTITIONING_HARD_SYSTEMS.map((system) => ({
        field: 'attributes.filepath',
        eq: `${system}.log`,
      })),
    });

    // Add remove processor to partitioning streams BEFORE indexing so that
    // attributes.filepath is stripped at ingest time, forcing the LLM to
    // analyze body.text content rather than relying on filepath as a discriminator.
    const partitioningStreams = [
      'logs.otel.partition-eval',
      'logs.otel.partition-homog',
      'logs.otel.partition-hard',
    ];
    for (const stream of partitioningStreams) {
      await apiServices.streams.updateStreamProcessors(stream, {
        steps: [{ action: 'remove', from: 'attributes.filepath' }],
      });
    }

    // Collect all systems needed across pipeline + partitioning tests
    const pipelineSystems = indexModeExamples.map((e) => e.input.system);
    const partitioningSystems = [
      ...PARTITIONING_EVAL_SYSTEMS,
      ...PARTITIONING_HOMOG_SYSTEMS,
      ...PARTITIONING_HARD_SYSTEMS,
    ];
    // Deduplicate systems: Hadoop appears in both EVAL and HARD; Linux appears in both HOMOG and HARD
    const uniqueSystems = [...new Set([...pipelineSystems, ...partitioningSystems])];
    const allSystems = uniqueSystems.join(',');
    const from = kbnDatemath.parse('now-5m')!;
    const to = kbnDatemath.parse('now')!;

    const sampleCounts = indexModeExamples
      .map((e) => e.input.sample_document_count)
      .filter((n): n is number => typeof n === 'number' && n > 0);

    if (sampleCounts.length === 0) {
      throw new Error('[streams eval setup] index-mode examples must set sample_document_count');
    }

    const maxSampleCount = Math.max(...sampleCounts);
    const systemCount = uniqueSystems.length;
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
