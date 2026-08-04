/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, errors as EsErrors } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { AI_INDEX_DATA_STREAM_PREFIX, AI_INDEX_INDEX_PREFIX } from '../common/constants';
import { getConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import { generateSampleKis } from './seed_ki_sample_data/lib/generate_kis';
import { kibanaRequest } from './seed_ki_sample_data/lib/kibana';

const DEFAULT_AI_INDEX_ID = 'sample-ki';
const DEFAULT_COUNT = 25;
const DEFAULT_TYPE_COUNT = 3;

async function dataStreamExists(esClient: Client, name: string): Promise<boolean> {
  try {
    const body = await esClient.indices.getDataStream({ name });
    return body.data_streams.length > 0;
  } catch (err) {
    if (err instanceof EsErrors.ResponseError && err.statusCode === 404) {
      return false;
    }
    throw err;
  }
}

async function ensureBackingStore(
  esClient: Client,
  destType: 'index' | 'data_stream',
  destValue: string
): Promise<void> {
  if (destType === 'data_stream') {
    const exists = await dataStreamExists(esClient, destValue);
    if (!exists) {
      await esClient.indices.createDataStream({ name: destValue });
    }
    return;
  }

  const exists = await esClient.indices.exists({ index: destValue });
  if (!exists) {
    await esClient.indices.create({ index: destValue });
  }
}

async function deleteBackingStore(
  esClient: Client,
  destType: 'index' | 'data_stream',
  destValue: string
): Promise<void> {
  if (destType === 'data_stream') {
    const exists = await dataStreamExists(esClient, destValue);
    if (exists) {
      await esClient.indices.deleteDataStream({ name: destValue });
    }
    return;
  }

  const exists = await esClient.indices.exists({ index: destValue });
  if (exists) {
    await esClient.indices.delete({ index: destValue });
  }
}

async function bulkIndexKis(
  esClient: Client,
  destValue: string,
  documents: ReturnType<typeof generateSampleKis>
): Promise<number> {
  const operations = documents.flatMap((doc) => [{ index: { _index: destValue } }, doc]);
  const response = await esClient.bulk({ refresh: true, operations });

  if (response.errors) {
    const failures = (response.items ?? [])
      .map((item, index) => {
        const error = item.index?.error;
        return error ? `doc ${index}: ${error.type} — ${error.reason}` : undefined;
      })
      .filter((msg): msg is string => msg !== undefined);
    throw new Error(`Bulk index failed:\n${failures.slice(0, 5).join('\n')}`);
  }

  return response.items?.length ?? documents.length;
}

async function registerAiIndex(
  config: Awaited<ReturnType<typeof getConnectionConfig>>,
  aiIndexId: string,
  destType: 'index' | 'data_stream',
  destValue: string,
  description: string
): Promise<void> {
  const { status, data } = await kibanaRequest(
    config,
    'PUT',
    `/api/context_engine/ai_index/${aiIndexId}`,
    {
      description,
      dest: { type: destType, value: destValue },
      automations: [],
      sources: [{ type: 'esql', value: `FROM ${destValue} | LIMIT 100` }],
    }
  );

  if (status !== 200 && status !== 201) {
    throw new Error(
      `Failed to register AI index "${aiIndexId}" (${status}): ${JSON.stringify(data)}`
    );
  }
}

async function deleteAiIndex(
  config: Awaited<ReturnType<typeof getConnectionConfig>>,
  aiIndexId: string
): Promise<void> {
  const { status } = await kibanaRequest(
    config,
    'DELETE',
    `/api/context_engine/ai_index/${aiIndexId}`
  );
  if (status !== 200 && status !== 404) {
    throw new Error(`Failed to delete AI index "${aiIndexId}" (status ${status})`);
  }
}

run(
  async ({ log, flags }) => {
    const config = await getConnectionConfig(flags, log);

    const aiIndexId = String(flags['ai-index-id'] || DEFAULT_AI_INDEX_ID);
    const destType = String(flags['dest-type'] || 'index') as 'index' | 'data_stream';
    if (destType !== 'index' && destType !== 'data_stream') {
      throw new Error('--dest-type must be "index" or "data_stream"');
    }

    const destPrefix =
      destType === 'data_stream' ? AI_INDEX_DATA_STREAM_PREFIX : AI_INDEX_INDEX_PREFIX;
    const destValue = String(flags.dest || `${destPrefix}${aiIndexId}`);
    const rawCount = flags.count;
    const count = rawCount === undefined || rawCount === '' ? DEFAULT_COUNT : Number(rawCount);
    const rawTypeCount = flags.types;
    const typeCount =
      rawTypeCount === undefined || rawTypeCount === '' ? DEFAULT_TYPE_COUNT : Number(rawTypeCount);
    const skipKibana = flags['skip-kibana'] === true;

    if (!destValue.startsWith(destPrefix)) {
      throw new Error(
        `dest "${destValue}" must start with "${destPrefix}" for dest-type "${destType}"`
      );
    }

    if (!Number.isInteger(count) || count < 1) {
      throw new Error('--count must be a positive integer');
    }

    if (!Number.isInteger(typeCount) || typeCount < 1) {
      throw new Error('--types must be a positive integer');
    }

    const esClient = new Client({
      node: config.esUrl,
      auth: { username: config.username, password: config.password },
    });

    if (flags.clean === true) {
      log.info('Cleaning previous sample data…');
      if (!skipKibana) {
        await deleteAiIndex(config, aiIndexId);
      }
      await deleteBackingStore(esClient, destType, destValue);
    }

    log.info(`Ensuring backing ${destType} "${destValue}" exists…`);
    await ensureBackingStore(esClient, destType, destValue);

    log.info(`Generating ${count} sample KIs across ${typeCount} types…`);
    const documents = generateSampleKis(count, typeCount);

    log.info(`Bulk indexing into "${destValue}"…`);
    const indexed = await bulkIndexKis(esClient, destValue, documents);
    log.info(`Indexed ${indexed} documents.`);

    if (skipKibana) {
      log.warning('Skipping Kibana AI index registration (--skip-kibana)');
    } else {
      log.info(`Registering AI index "${aiIndexId}" in Context Engine…`);
      await registerAiIndex(
        config,
        aiIndexId,
        destType,
        destValue,
        'Sample Knowledge Indicators for local UI development'
      );
      log.info(`AI index registered. Open Context Engine → "${aiIndexId}" in Kibana.`);
    }

    log.info('Done.');
    log.info(`  ES ${destType}: ${destValue}`);
    log.info(`  AI index id: ${aiIndexId}`);
    log.info(`  Sample ES|QL: FROM ${destValue} | LIMIT 10`);
  },
  {
    description:
      'Seed sample Knowledge Indicators into Elasticsearch and register a Context Engine AI index.',
    flags: {
      string: [
        'ai-index-id',
        'dest',
        'dest-type',
        'count',
        'types',
        'es-url',
        'es-username',
        'es-password',
        'kibana-url',
      ],
      boolean: ['clean', 'skip-kibana'],
      help: `
        --ai-index-id <id>     Context Engine AI index id (default: ${DEFAULT_AI_INDEX_ID})
        --dest <name>          Backing index or data stream (default: ai-index-idx-<id> or ai-index-ds-<id>)
        --dest-type <type>     "index" or "data_stream" (default: index)
        --count <n>            Number of sample KIs to ingest (default: ${DEFAULT_COUNT})
        --types <n>            Number of distinct KI types to generate (default: ${DEFAULT_TYPE_COUNT})
        --clean                Delete existing AI index + backing store before seeding
        --skip-kibana          Only write to Elasticsearch; skip Context Engine registration
        --es-url <url>         Elasticsearch URL (default: http://localhost:9200)
        --es-username <user>   ES username (default: elastic)
        --es-password <pass>   ES password (default: changeme)
        --kibana-url <url>     Kibana base URL (default: from kibana.dev.yml)

        Usage:
          node scripts/seed_ki_sample_data.js
          node scripts/seed_ki_sample_data.js --clean
          node scripts/seed_ki_sample_data.js --dest-type data_stream --count 50
          node scripts/seed_ki_sample_data.js --count 200 --types 50
      `,
    },
  }
);
