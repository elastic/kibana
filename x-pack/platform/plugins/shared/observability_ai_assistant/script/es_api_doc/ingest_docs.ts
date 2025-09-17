/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { resolve } from 'node:path';

async function run() {
  const indexName = 'kibana_ai_es_api_doc';
  const inputPath = resolve(__dirname, 'documents.json');
  const raw = readFileSync(inputPath, 'utf-8');
  const documents: Record<string, any>[] = JSON.parse(raw);

  const esClient = new Client({
    node: 'http://elastic:changeme@127.0.0.1:9200/',
    Connection: HttpConnection,
    requestTimeout: 300_000,
  });

  const exists = await esClient.indices.exists({ index: indexName });
  if (!exists) {
    await esClient.indices.create({
      index: indexName,
      mappings: {
        properties: {
          description: { type: 'semantic_text' },
          title: { type: 'semantic_text' },
          summary: { type: 'semantic_text' },
          metadata: { type: 'flattened' },
        },
      },
    });
  }

  const operations = documents.reduce((ops, document) => {
    ops!.push(...[{ index: { _index: indexName } }, document]);
    return ops;
  }, []);

  const response = await esClient.bulk({
    refresh: false,
    operations: operations as any,
  });

  if (response.errors) {
    const error = response.items.find((item) => item.index?.error)?.index?.error ?? 'unknown error';
    throw new Error(`Error indexing documents: ${JSON.stringify(error)}`);
  }
}

run().catch((err) => {
  process.exit(1);
});
