/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { restoreEnvSnapshot } from './restore_env_snapshot';

run(({ log, flags }) => restoreEnvSnapshot({ log, flags }), {
  description: `
    Restore a Streams/SigEvents environment from a GCS snapshot.

    Automates the full three-step restore workflow:
      1. Replay data indices with timestamp transformation (replaySnapshot)
      2. Restore system indices with rename: snapshot-* → .* (restoreSnapshot)
      3. Recreate missing .kibana_* aliases (createMissingAliases)

    Prerequisites:
      - Local Elasticsearch running
      - Access to the GCS bucket containing the snapshot

    Examples:
      node scripts/restore_sigevents_env_snapshot.js \\
        --snapshot-name my-snapshot \\
        --gcs-bucket significant-events-datasets \\
        --gcs-base-path 2026-03-22/sigevents-2026-03-22
  `,
  flags: {
    string: [
      'es-url',
      'es-username',
      'es-password',
      'snapshot-name',
      'gcs-bucket',
      'gcs-base-path',
      'indices',
      'system-indices',
    ],
    help: `
      --snapshot-name         (required) Name of the snapshot to restore
      --gcs-bucket            GCS bucket containing the snapshot (default: significant-events-datasets)
      --gcs-base-path         (required) GCS base path to the snapshot repository
      --indices               Data index to replay. Can be repeated. (default: logs.otel)
      --system-indices        .kibana system index pattern to restore. Can be repeated. (default: .kibana_streams_features-* .kibana_streams_assets-*)
      --es-url                Elasticsearch URL (default: from kibana.dev.yml)
      --es-username           ES username (default: from kibana.dev.yml)
      --es-password           ES password (default: from kibana.dev.yml)
    `,
  },
});
