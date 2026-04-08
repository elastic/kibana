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

const indexModeExamples = PIPELINE_SUGGESTION_DATASETS.flatMap((dataset) =>
  dataset.examples.filter(
    (example) => !example.input.sample_documents || example.input.sample_documents.length === 0
  )
);

globalSetupHookWithSynthtrace(
  'Streams eval setup',
  { tag: tags.stateful.classic },
  async ({ apiServices, config, log }) => {
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
    const from = kbnDatemath.parse('now-2m')!;
    const to = kbnDatemath.parse('now')!;

    await indexSynthtraceScenario({
      scenario: 'sample_logs',
      scenarioOpts: { systems: allSystems, rpm: 100, streamType: 'wired' },
      config,
      from,
      to,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    log.info('[streams eval setup] done');
  }
);
