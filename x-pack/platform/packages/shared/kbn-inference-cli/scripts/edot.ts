/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { ensureEdot } from '../src/edot/ensure_edot';

run(
  ({ log, addCleanupTask }) => {
    const controller = new AbortController();

    addCleanupTask(() => {
      controller.abort();
    });

    return ensureEdot({
      log,
      signal: controller.signal,
    }).catch((error) => {
      throw new Error('Failed to start EDOT', { cause: error });
    });
  },
  {
    description: `
      Start EDOT (Elastic Distribution of OpenTelemetry Collector) and connect it to Elasticsearch.
      
      Reads Elasticsearch connection details from kibana.yml and kibana.dev.yml, generates 
      OpenTelemetry Collector configuration, and starts a Docker container to collect host 
      and Docker metrics.
    `,
    flags: {
      string: ['config'],
      alias: {
        c: 'config',
      },
      help: `
        --config, -c       Path to Kibana config file (can be specified multiple times)
      `,
    },
  }
);
