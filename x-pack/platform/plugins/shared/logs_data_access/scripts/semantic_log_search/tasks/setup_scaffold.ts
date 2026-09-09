/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from '../lib/connection_config';

interface SetupScaffoldParams {
  esClient: Client;
  config: ConnectionConfig;
  log: ToolingLog;
}

/**
 * Resolve the default inference endpoint.
 * Priority: ELSER in EIS > local ELSER
 */
async function resolveInferenceEndpoint(esClient: Client, log: ToolingLog): Promise<string> {
  const response = await esClient.inference.get({});
  const endpoints = response.endpoints ?? [];

  const sparseEndpoints = endpoints.filter((ep) => ep.task_type === 'sparse_embedding');
  const elserInEis = sparseEndpoints.find((ep) => ep.inference_id === '.elser-2-elastic');
  const localElser = sparseEndpoints.find((ep) => ep.inference_id === '.elser-2-elasticsearch');

  const endpoint = elserInEis ?? localElser ?? sparseEndpoints[0];

  if (!endpoint) {
    throw new Error('No sparse_embedding inference endpoint available. Start ES with --eis flag.');
  }

  log.info(`Using inference endpoint: ${endpoint.inference_id}`);
  return endpoint.inference_id;
}

/**
 * Set up the PoC scaffold data stream.
 *
 * Creates a data stream with:
 * - message as pattern_text with copy_to to message_semantic
 * - message_semantic as semantic_text
 *
 * Then reindexes from the source index (logs-synth-default) to populate it.
 */
export async function setupScaffold({ esClient, config, log }: SetupScaffoldParams): Promise<void> {
  const { sourceIndex, targetDataStream } = config;

  // Check source exists and has documents
  const countResponse = await esClient.count({ index: sourceIndex });
  const sourceCount = countResponse.count;

  if (sourceCount === 0) {
    throw new Error(
      `Source index ${sourceIndex} is empty. Run synthtrace first:\n` +
        `  node scripts/synthtrace sigevents --target=http://elastic:changeme@localhost:9200 ` +
        `--kibana=http://elastic:changeme@localhost:5620 --scenarioOpts="scenario=postgres_timeout,seed=42" ` +
        `--from=now-2h --to=now --clean`
    );
  }

  log.info(`Source documents: ${sourceCount} in ${sourceIndex}`);

  // Resolve inference endpoint
  const inferenceId = await resolveInferenceEndpoint(esClient, log);

  // Delete existing data stream if it exists
  try {
    await esClient.indices.deleteDataStream({ name: targetDataStream });
    log.info(`Deleted existing data stream: ${targetDataStream}`);
  } catch (e) {
    // Ignore 404
  }

  // Delete existing index template if it exists
  const templateName = 'poc-semantic-logs';
  try {
    await esClient.indices.deleteIndexTemplate({ name: templateName });
    log.info(`Deleted existing template: ${templateName}`);
  } catch (e) {
    // Ignore 404
  }

  // Create index template
  log.info(`Creating index template: ${templateName}`);
  await esClient.indices.putIndexTemplate({
    name: templateName,
    index_patterns: ['logs-poc.a-*'],
    priority: 500, // Higher than built-in logs template
    data_stream: {},
    template: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        'index.mapping.semantic_text.use_legacy_format': false,
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: {
            type: 'pattern_text',
            copy_to: ['message_semantic'],
          },
          message_semantic: {
            type: 'semantic_text',
            inference_id: inferenceId,
          },
        },
      },
    },
  });

  // Create data stream
  log.info(`Creating data stream: ${targetDataStream}`);
  await esClient.indices.createDataStream({ name: targetDataStream });

  // Reindex from source
  log.info(`Reindexing ${sourceCount} documents (every one is embedded, expect minutes)...`);

  const reindexResponse = await esClient.reindex({
    wait_for_completion: false,
    source: { index: sourceIndex },
    dest: { index: targetDataStream, op_type: 'create' },
  });

  const taskId = reindexResponse.task;
  log.info(`Reindex task started: ${taskId}`);

  // Poll for completion
  let completed = false;
  while (!completed) {
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s

    const taskResponse = await esClient.tasks.get({ task_id: String(taskId) });
    const status = taskResponse.task?.status as {
      created?: number;
      total?: number;
    };
    const failures = (taskResponse.response as { failures?: unknown[] })?.failures ?? [];

    log.info(
      `  ${status?.created ?? 0} / ${status?.total ?? sourceCount} (failures: ${failures.length})`
    );

    completed = taskResponse.completed ?? false;

    if (failures.length > 0) {
      log.warning(`First failure: ${JSON.stringify(failures[0]).slice(0, 500)}`);
    }
  }

  // Refresh
  await esClient.indices.refresh({ index: targetDataStream });

  // Verify
  const targetCount = await esClient.count({ index: targetDataStream });
  log.success(`Setup complete: ${targetCount.count} documents in ${targetDataStream}`);

  // Quick verification query
  const verifyResponse = await esClient.search({
    index: targetDataStream,
    size: 1,
    query: {
      semantic: {
        field: 'message_semantic',
        query: 'connection failure',
      },
    },
  });

  if (verifyResponse.hits.hits.length > 0) {
    log.success('Semantic search verification passed');
  } else {
    log.warning('Semantic search returned no results - inference may still be processing');
  }
}
