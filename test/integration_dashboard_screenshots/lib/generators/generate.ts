/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  readConfig,
  generatePackage,
  listPackagesWithDashboards,
  hasExistingSampleData,
} from './engine';

const main = () => {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const force = args.includes('--force');
  const packages = isAll
    ? listPackagesWithDashboards()
    : args.filter((a) => !a.startsWith('--'));

  if (packages.length === 0) {
    console.log('Usage: npx ts-node generate.ts <package> [<package2> ...] | --all [--force]');
    process.exit(1);
  }

  console.log(`Generating data for ${packages.length} package(s)...\n`);
  let totalDocs = 0;
  let skipped = 0;
  let errors = 0;

  for (const pkg of packages) {
    if (!force && hasExistingSampleData(pkg)) {
      console.log(`  ${pkg}: skipped (already exists, use --force)`);
      skipped++;
      continue;
    }

    const config = readConfig(pkg);
    if (!config) {
      console.log(`  ${pkg}: no config found (run analyze first)`);
      errors++;
      continue;
    }

    if (config.dataStreams.length === 0) {
      console.log(`  ${pkg}: no data streams in config, skipping`);
      skipped++;
      continue;
    }

    try {
      const results = generatePackage(config);
      const docCount = results.reduce((sum, r) => sum + r.count, 0);
      totalDocs += docCount;

      const summary = results.map((r) => `${r.dataset}(${r.count}/${r.source})`).join(', ');
      console.log(`  ${pkg}: ${docCount} docs [${summary}]`);
    } catch (err: any) {
      console.error(`  ${pkg}: ERROR - ${err.message}`);
      errors++;
    }
  }

  console.log(
    `\nDone. ${totalDocs} total docs, ${skipped} skipped, ${errors} errors.`
  );
};

main();
