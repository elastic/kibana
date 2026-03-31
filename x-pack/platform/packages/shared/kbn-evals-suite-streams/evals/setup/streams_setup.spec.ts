/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { PIPELINE_SUGGESTION_DATASETS } from '../pipeline_suggestion/pipeline_suggestion_datasets';
import { indexSynthtraceScenario } from '../synthtrace_helpers';

const indexModeExamples = PIPELINE_SUGGESTION_DATASETS.flatMap((dataset) =>
  dataset.examples.filter(
    (example) => !example.input.sample_documents || example.input.sample_documents.length === 0
  )
);

evaluate.describe.configure({ mode: 'serial' });

evaluate.describe('Streams eval setup', { tag: tags.stateful.classic }, () => {
  evaluate('Enable streams', async ({ apiServices }) => {
    await apiServices.streams.enable();
  });

  evaluate(
    'Fork child streams and index data for pipeline suggestion',
    async ({ apiServices, config }) => {
      if (indexModeExamples.length === 0) return;

      // Clean up child streams from previous runs before forking
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

      // Wait for data to be routed to child streams
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  );
});
