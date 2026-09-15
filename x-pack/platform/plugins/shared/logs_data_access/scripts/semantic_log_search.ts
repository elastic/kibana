/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { getConnectionConfig } from './semantic_log_search/lib/connection_config';
import { createEsClient } from './semantic_log_search/lib/es_client';
import { setupScaffold } from './semantic_log_search/tasks/setup_scaffold';
import { auditCorpus } from './semantic_log_search/tasks/audit_corpus';
import { runEval } from './semantic_log_search/tasks/run_eval';

/**
 * Semantic log search evaluation harness.
 *
 * Three tasks:
 *   --task setup  - Create the PoC data stream with semantic_text and pattern_text
 *   --task audit  - Verify ground truth labels are present in the corpus
 *   --task eval   - Run retrieval evaluation against the service
 *
 * Prerequisites:
 *   - Elasticsearch running at --es (default http://localhost:9200)
 *   - For setup: logs-synth-default populated via synthtrace
 *
 * Example:
 *   node scripts/semantic_log_search.ts --task setup
 *   node scripts/semantic_log_search.ts --task audit
 *   node scripts/semantic_log_search.ts --task eval
 */
run(
  async ({ log, flagsReader }) => {
    const task = flagsReader.requiredString('task');
    const config = getConnectionConfig(flagsReader);

    log.info(`Running task: ${task}`);
    log.info(`Elasticsearch: ${config.esUrl}`);

    const esClient = createEsClient(config);

    try {
      switch (task) {
        case 'setup':
          await setupScaffold({ esClient, config, log });
          break;

        case 'audit':
          await auditCorpus({ esClient, config, log });
          break;

        case 'eval':
          await runEval({ esClient, config, log });
          break;

        default:
          log.error(`Unknown task: ${task}`);
          log.info('Available tasks: setup, audit, eval');
          process.exit(1);
      }
    } finally {
      await esClient.close();
    }
  },
  {
    description: 'Semantic log search evaluation harness',
    flags: {
      string: ['task', 'es', 'user', 'password', 'source', 'target'],
      default: {
        task: 'eval',
        es: 'http://localhost:9200',
        user: 'elastic',
        password: 'changeme',
        source: 'logs-synth-default',
        target: 'logs-poc.a-default',
      },
      help: `
        --task       Task to run: setup | audit | eval (default: eval)
        --es         Elasticsearch URL (default: http://localhost:9200)
        --user       Elasticsearch user (default: elastic)
        --password   Elasticsearch password (default: changeme)
        --source     Source index for setup (default: logs-synth-default)
        --target     Target data stream for setup (default: logs-poc.a-default)
      `,
    },
  }
);
