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

/**
 * Pipeline evals fetch up to this many docs per example (`sample_document_count`). LogHub synthtrace
 * uses `distribution: 'uniform'`, which splits total rpm across systems — so total rpm must be
 * `MIN_INDEXED_SAMPLES_PER_SYSTEM * systemCount` to target ~that rpm per system.
 */
const MIN_INDEXED_SAMPLES_PER_SYSTEM = 100;

const indexModeExamples = PIPELINE_SUGGESTION_DATASETS.flatMap((dataset) =>
  dataset.examples.filter(
    (example) => !example.input.sample_documents || example.input.sample_documents.length === 0
  )
);

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
    const loghubSystemCount = new Set(indexModeExamples.map((e) => e.input.system)).size;
    const synthtraceRpm = MIN_INDEXED_SAMPLES_PER_SYSTEM * loghubSystemCount;

    // Longer window + higher total rpm so each LogHub generator (uniform split) can emit enough
    // events before evals read from child streams.
    const from = kbnDatemath.parse('now-4m')!;
    const to = kbnDatemath.parse('now')!;

    log.info(
      `[streams eval setup] synthtrace sample_logs rpm=${synthtraceRpm} (${loghubSystemCount} LogHub systems × ${MIN_INDEXED_SAMPLES_PER_SYSTEM} target rpm each)`
    );

    await indexSynthtraceScenario({
      scenario: 'sample_logs',
      scenarioOpts: { systems: allSystems, rpm: synthtraceRpm, streamType: 'wired' },
      config,
      from,
      to,
    });

    await esClient.indices.refresh({
      index: 'logs.otel,logs.otel.*',
      allow_no_indices: true,
      ignore_unavailable: true,
    });

    for (const example of indexModeExamples) {
      const { count } = await esClient.count({ index: example.input.stream_name });
      if (count < MIN_INDEXED_SAMPLES_PER_SYSTEM) {
        throw new Error(
          `[streams eval setup] stream "${example.input.stream_name}" has ${count} documents (need >= ${MIN_INDEXED_SAMPLES_PER_SYSTEM}). ` +
            `Check synthtrace sample_logs rpm/window and LogHub routing for ${example.input.system}.log`
        );
      }
      log.info(
        `[streams eval setup] ${example.input.stream_name}: ${count} documents (>= ${MIN_INDEXED_SAMPLES_PER_SYSTEM})`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
    log.info('[streams eval setup] done');
  }
);
