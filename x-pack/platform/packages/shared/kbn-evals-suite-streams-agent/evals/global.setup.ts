/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import kbnDatemath from '@kbn/datemath';
import { globalSetupHookWithSynthtrace } from '@kbn/scout-synthtrace';
import { tags } from '@kbn/scout';
import { indexSynthtraceScenario } from '@kbn/evals-suite-streams/evals/synthtrace_helpers';

/**
 * Global setup for the streams agent eval suite.
 *
 * Creates the shared data tier:
 * 1. Enable streams
 * 2. Index OTel logs via synthtrace into `logs.otel` (Apache + Linux loghub systems)
 * 3. Fork `logs.otel.apache` (filepath=Apache.log) + add broken grok processor
 * 4. Fork `logs.otel.linux` (filepath=Linux.log)
 *
 * Shared streams are read-only from the evals' perspective — write scenarios
 * stop at the confirmation prompt, so no mutations execute.
 */
globalSetupHookWithSynthtrace(
  'Streams agent eval setup',
  { tag: tags.stateful.classic },
  async ({ apiServices, config, log }) => {
    log.info('[streams-agent setup] enabling streams');
    await apiServices.streams.enable();

    log.info('[streams-agent setup] cleaning up children from previous runs');
    await apiServices.streams.clearStreamChildren('logs.otel');

    log.info('[streams-agent setup] forking shared child streams');

    await apiServices.streams.forkStream('logs.otel', 'logs.otel.apache', {
      field: 'attributes.filepath',
      eq: 'Apache.log',
    });

    await apiServices.streams.forkStream('logs.otel', 'logs.otel.linux', {
      field: 'attributes.filepath',
      eq: 'Linux.log',
    });

    log.info('[streams-agent setup] indexing synthtrace OTel logs');
    const from = kbnDatemath.parse('now-5m')!;
    const to = kbnDatemath.parse('now')!;

    await indexSynthtraceScenario({
      scenario: 'sample_logs',
      scenarioOpts: { systems: 'Apache,Linux', rpm: 100, streamType: 'wired' },
      config,
      from,
      to,
    });

    // Wait for data to be indexed and available
    await new Promise((resolve) => setTimeout(resolve, 5000));

    log.info('[streams-agent setup] configuring shared streams');

    // Add a grok processor that is syntactically valid but will never match
    // Apache log lines (which start with "[Wed Apr 15 ..." not a bare integer).
    // This causes ingestion failures on new documents routed to this stream.
    await apiServices.streams.updateStreamProcessors('logs.otel.apache', {
      steps: [
        {
          action: 'grok',
          from: 'body.text',
          patterns: ['%{INT:attributes.line_number} %{GREEDYDATA:attributes.rest}'],
        },
      ],
    });

    // Wait for processors to take effect on new documents
    await new Promise((resolve) => setTimeout(resolve, 3000));

    log.info('[streams-agent setup] done');
  }
);
