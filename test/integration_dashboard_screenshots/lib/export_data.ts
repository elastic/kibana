/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { createEsClient } from './kibana_client';

const SEED_DATA_DIR = path.resolve(__dirname, '..', '.seed-data');

const getConfig = () => {
  const esUrl = process.env.EXPORT_ES_URL || 'https://localhost:9200';
  const esUser = process.env.EXPORT_ES_USER || 'elastic';
  const esPassword = process.env.EXPORT_ES_PASSWORD || 'changeme';
  const packages = (process.env.EXPORT_PACKAGES || '').split(',').filter(Boolean);

  if (packages.length === 0) {
    throw new Error(
      'EXPORT_PACKAGES is required (comma-separated list of package names to export)'
    );
  }

  return { esUrl, esUser, esPassword, packages };
};

const fetchAllDocuments = async (
  es: ReturnType<typeof createEsClient>,
  dataStreamName: string
): Promise<Record<string, unknown>[]> => {
  const docs: Record<string, unknown>[] = [];
  const pageSize = 1000;

  const firstPage = await es.post(`/${dataStreamName}/_search`, {
    size: pageSize,
    sort: [{ '@timestamp': 'asc' }],
  });

  if (firstPage.status !== 200 || !firstPage.body?.hits?.hits) {
    return [];
  }

  for (const hit of firstPage.body.hits.hits) {
    docs.push(hit._source);
  }

  let searchAfter =
    firstPage.body.hits.hits.length > 0
      ? firstPage.body.hits.hits[firstPage.body.hits.hits.length - 1].sort
      : null;

  while (searchAfter) {
    const page = await es.post(`/${dataStreamName}/_search`, {
      size: pageSize,
      sort: [{ '@timestamp': 'asc' }],
      search_after: searchAfter,
    });

    if (!page.body?.hits?.hits?.length) break;

    for (const hit of page.body.hits.hits) {
      docs.push(hit._source);
    }

    searchAfter =
      page.body.hits.hits.length === pageSize
        ? page.body.hits.hits[page.body.hits.hits.length - 1].sort
        : null;
  }

  return docs;
};

const main = async () => {
  const { esUrl, esUser, esPassword, packages } = getConfig();

  console.log('=== Export Data from Local ES ===');
  console.log(`ES:       ${esUrl}`);
  console.log(`Packages: ${packages.join(', ')}`);
  console.log();

  const es = createEsClient({ baseUrl: esUrl, username: esUser, password: esPassword });

  const dsRes = await es.get('/_data_stream');
  if (dsRes.status !== 200) {
    throw new Error(`Failed to list data streams: ${dsRes.status}`);
  }

  const allStreams: Array<{ name: string }> = dsRes.body.data_streams ?? [];

  for (const pkg of packages) {
    const pkgDir = path.join(SEED_DATA_DIR, pkg);
    const matching = allStreams.filter((ds) => {
      const name = ds.name;
      return name.startsWith(`logs-${pkg}.`) || name.startsWith(`metrics-${pkg}.`);
    });

    if (matching.length === 0) {
      console.log(`[${pkg}] No data streams found, skipping`);
      continue;
    }

    fs.mkdirSync(pkgDir, { recursive: true });
    console.log(`[${pkg}] Found ${matching.length} data stream(s)`);

    for (const ds of matching) {
      const docs = await fetchAllDocuments(es, ds.name);
      if (docs.length === 0) {
        console.log(`  ${ds.name}: 0 docs, skipping`);
        continue;
      }

      const firstDash = ds.name.indexOf('-');
      const lastDash = ds.name.lastIndexOf('-');
      const dataset = ds.name.slice(firstDash + 1, lastDash);
      const filename = `${dataset}.json`;

      fs.writeFileSync(path.join(pkgDir, filename), JSON.stringify(docs, null, 2));
      console.log(`  ${ds.name}: ${docs.length} docs -> .seed-data/${pkg}/${filename}`);
    }
  }

  console.log('\nDone! Seed data saved to .seed-data/');
  console.log('These files will be used as the primary data source during ingest.');
};

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
