/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { Client, errors } from '@elastic/elasticsearch';
import type { ExtraKnowledgeIndicator } from '../../src/data_generators/extra_knowledge_indicators';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../src/data_generators/extra_knowledge_indicators/cart_redis_cutoff_extra_kis.json'
);

const DEFAULT_SOURCE_INDEX = '.ab-generated-kis';
const MAX_SIZE = 1000;

run(
  async ({ log, flags }) => {
    const esUrl = process.env.ES_URL;
    const esApiKey = process.env.ES_API_KEY;

    if (!esUrl) {
      throw new Error('Missing required env var: ES_URL');
    }
    if (!esApiKey) {
      throw new Error('Missing required env var: ES_API_KEY');
    }

    const sourceIndex = String(
      flags['source-index'] || process.env.SOURCE_INDEX || DEFAULT_SOURCE_INDEX
    );

    log.info(`Connecting to ${esUrl}`);
    log.info(`Source index: ${sourceIndex}`);

    const esClient = new Client({ node: esUrl, auth: { apiKey: esApiKey } });

    let hits: Array<{ _source?: Record<string, unknown> }>;
    try {
      const result = await esClient.search({
        index: sourceIndex,
        size: MAX_SIZE,
        query: { match_all: {} },
      });
      hits = result.hits.hits as Array<{ _source?: Record<string, unknown> }>;
    } catch (err) {
      if (err instanceof errors.ResponseError && err.statusCode === 404) {
        throw new Error(
          `Index "${sourceIndex}" not found. Make sure the source index exists and ` +
            `ES_URL points to the correct cluster.`
        );
      }
      throw err;
    }

    log.info(`Fetched ${hits.length} document(s) from "${sourceIndex}"`);

    const kis: ExtraKnowledgeIndicator[] = [];

    for (const hit of hits) {
      const source = hit._source ?? {};

      const streamRaw = source.stream as { name?: string } | undefined;
      if (!streamRaw || typeof streamRaw.name !== 'string') {
        log.warning(`Skipping document — missing or invalid "stream" field: ${JSON.stringify(source)}`);
        continue;
      }

      const ki: ExtraKnowledgeIndicator = {
        id: String(source.id ?? ''),
        type: (source.type as 'feature' | 'query') ?? 'feature',
        title: String(source.title ?? ''),
        description: String(source.description ?? ''),
        stream: { name: streamRaw.name },
      };

      if (Array.isArray(source.tags)) {
        ki.tags = source.tags.map(String);
      }
      if (Array.isArray(source.evidence)) {
        ki.evidence = source.evidence.map(String);
      }
      if (source.feature != null && typeof source.feature === 'object') {
        ki.feature = source.feature as Record<string, unknown>;
      }
      if (source.query != null && typeof source.query === 'object') {
        ki.query = source.query as Record<string, unknown>;
      }

      kis.push(ki);
    }

    log.info(`Writing ${kis.length} knowledge indicator(s) to ${FIXTURE_PATH}`);
    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(kis, null, 2) + '\n', 'utf-8');
    log.info(`Done. ${kis.length} KI(s) written.`);
  },
  {
    description: `
      Export AB-generated Knowledge Indicators from a live Elasticsearch cluster
      into the fixture file used by the A/B eval injection helper.

      Reads credentials from environment variables (never from CLI flags):
        ES_URL       Elasticsearch URL (required)
        ES_API_KEY   Elasticsearch API key (required — never logged)
        SOURCE_INDEX Source index (default: ${DEFAULT_SOURCE_INDEX})

      Output: src/data_generators/extra_knowledge_indicators/cart_redis_cutoff_extra_kis.json

      Example:
        ES_URL=https://my-cluster.es.io \\
        ES_API_KEY=<key> \\
        node scripts/export_ab_generated_kis.js

        ES_URL=https://my-cluster.es.io \\
        ES_API_KEY=<key> \\
        SOURCE_INDEX=.my-custom-index \\
        node scripts/export_ab_generated_kis.js

        ES_URL=https://my-cluster.es.io \\
        ES_API_KEY=<key> \\
        node scripts/export_ab_generated_kis.js --source-index .my-custom-index
    `,
    flags: {
      string: ['source-index'],
      help: `
        --source-index   Source index to read KIs from (default: ${DEFAULT_SOURCE_INDEX};
                         also readable from SOURCE_INDEX env var)
      `,
    },
  }
);
