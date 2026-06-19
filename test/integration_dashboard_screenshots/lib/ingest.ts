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
import { createKibanaClient, createEsClient } from './kibana_client';
import { createFleetClient } from './fleet_client';
import type { PackageDashboards } from './fleet_client';
import { setupPrerequisites, seedDataForPackage, cleanupCorpora } from './data_seeder';

const MANIFEST_PATH = path.resolve(__dirname, '..', 'dashboard_manifest.json');

const getConfig = () => {
  const kibanaUrl = process.env.KIBANA_URL || 'http://localhost:5601';
  const esUrl = process.env.ELASTICSEARCH_URL;
  const user = process.env.ES_USER || 'elastic';
  const password = process.env.ES_PASSWORD || 'changeme';
  const packagesFilter = process.env.PACKAGES?.split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (!esUrl) {
    throw new Error('ELASTICSEARCH_URL is required. Set it in .env or as an environment variable.');
  }

  return { kibanaUrl, esUrl, user, password, packagesFilter };
};

const main = async () => {
  const config = getConfig();

  console.log('=== Integration Dashboard Ingest ===');
  console.log(`Kibana:  ${config.kibanaUrl}`);
  console.log(`ES:      ${config.esUrl}`);
  console.log(`Filter:  ${config.packagesFilter?.join(', ') || '(all packages)'}`);
  console.log('');

  setupPrerequisites();

  const kibana = createKibanaClient({
    baseUrl: config.kibanaUrl,
    username: config.user,
    password: config.password,
  });

  const es = createEsClient({
    baseUrl: config.esUrl,
    username: config.user,
    password: config.password,
  });

  const fleet = createFleetClient(kibana);

  console.log('Raising cluster shard limit for bulk ingest...');
  const shardRes = await es.put('/_cluster/settings', {
    persistent: { 'cluster.max_shards_per_node': 3000 },
  });
  if (shardRes.status === 200) {
    console.log('  Set cluster.max_shards_per_node = 3000');
  } else {
    console.warn(`  Failed to update shard limit: ${shardRes.status}`, shardRes.body);
  }
  console.log('');

  console.log('Fetching available packages...');
  const allPackages = await fleet.getAvailablePackages();
  let packageNames = allPackages.map((p) => p.name);

  if (config.packagesFilter) {
    packageNames = packageNames.filter((name) => config.packagesFilter!.includes(name));
  }

  console.log(`Found ${packageNames.length} packages to process.\n`);

  console.log('=== Phase 1: Installing packages ===');
  const manifest = await fleet.installAllPackages(packageNames);
  console.log(`\nInstalled ${manifest.length} packages with dashboards.\n`);

  console.log('=== Phase 2: Extracting dashboard filter requirements ===');
  const allDashboardIds = manifest.flatMap((m) => m.dashboards.map((d) => d.id));
  const perStreamOverrides = await fleet.getDashboardFilterOverrides(allDashboardIds);
  const datasetCount = Object.keys(perStreamOverrides).length;
  if (datasetCount > 0) {
    console.log(`Extracted filter overrides for ${datasetCount} dataset scope(s):`);
    for (const [dataset, fields] of Object.entries(perStreamOverrides)) {
      const fieldList = Object.entries(fields)
        .map(([f, v]) => `${f}(${v.length})`)
        .join(', ');
      console.log(`  ${dataset}: ${fieldList}`);
    }
  }
  console.log('');

  console.log('=== Phase 3: Seeding data from pipeline test outputs ===');
  let totalDocs = 0;
  let seededPackages = 0;

  for (let i = 0; i < packageNames.length; i++) {
    const name = packageNames[i];
    const info = await fleet.getPackageInfo(name);
    if (!info || info.dataStreams.length === 0) {
      continue;
    }

    console.log(
      `[${i + 1}/${packageNames.length}] Seeding ${name}@${info.version} (${
        info.dataStreams.length
      } data streams)`
    );

    const docs = await seedDataForPackage(es, info, perStreamOverrides);
    if (docs > 0) {
      totalDocs += docs;
      seededPackages++;
    }
  }

  console.log(`\nSeeded ${totalDocs} total documents across ${seededPackages} packages.\n`);

  console.log('=== Writing dashboard manifest ===');
  const manifestData: PackageDashboards[] = manifest;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestData, null, 2));
  console.log(`Wrote ${MANIFEST_PATH}`);
  console.log(
    `Total: ${manifestData.reduce((sum, p) => sum + p.dashboards.length, 0)} dashboards across ${
      manifestData.length
    } packages`
  );

  cleanupCorpora();
  console.log('\nDone!');
};

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
