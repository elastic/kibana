/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { captureEnvSnapshot } from './capture_env_snapshot';

run(({ log, flags }) => captureEnvSnapshot({ log, flags }), {
  description: `
    Capture the current Streams/SigEvents environment into a GCS snapshot.

    .kibana system indices (--system-indices) are reindexed to snapshot-safe
    names (snapshot-*) with mappings and aliases preserved. At restore time
    they are renamed back (snapshot- → .).
    All other indices (--indices) are included directly in the snapshot and
    replayed with timestamp transformation.

    Prerequisites:
      - Local Elasticsearch with GCS credentials in keystore

    Examples:
      node scripts/capture_sigevents_env_snapshot.js --snapshot-name my-snapshot
  `,
  flags: {
    string: [
      'es-url',
      'es-username',
      'es-password',
      'snapshot-name',
      'run-id',
      'indices',
      'system-indices',
    ],
    help: `
      --snapshot-name         (required) Name for the snapshot
      --run-id                Run identifier for GCS repo name and base path (default: today's date YYYY-MM-DD)
      --indices               Data index to include in snapshot + replay. Can be repeated. (default: logs.otel .internal.alerts-streams.alerts-default-*)
      --system-indices        .kibana system index pattern to capture. Can be repeated. (default: .kibana_streams_features-* .kibana_streams_assets-*)
      --es-url                Elasticsearch URL (default: from kibana.dev.yml)
      --es-username           ES username (default: from kibana.dev.yml)
      --es-password           ES password (default: from kibana.dev.yml)
    `,
  },
});
