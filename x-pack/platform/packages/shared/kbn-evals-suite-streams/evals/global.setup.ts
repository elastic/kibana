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

    // Collect all systems needed across pipeline + partitioning tests
    const pipelineSystems = indexModeExamples.map((e) => e.input.system);
    const partitioningSystems = [...PARTITIONING_EVAL_SYSTEMS, ...PARTITIONING_HOMOG_SYSTEMS];
    const allSystems = [...pipelineSystems, ...partitioningSystems].join(',');

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
