/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyzePackage, writeConfig, listPackagesWithDashboards } from './engine';

const main = () => {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const packages = isAll ? listPackagesWithDashboards() : args.filter((a) => !a.startsWith('--'));

  if (packages.length === 0) {
    console.log('Usage: npx ts-node analyze.ts <package> [<package2> ...] | --all');
    process.exit(1);
  }

  console.log(`Analyzing ${packages.length} package(s)...\n`);
  let totalStreams = 0;
  let totalFields = 0;

  for (const pkg of packages) {
    const config = analyzePackage(pkg);
    const configPath = writeConfig(config);
    const streamCount = config.dataStreams.length;
    const fieldCount = config.dataStreams.reduce((sum, ds) => sum + ds.fields.length, 0);
    totalStreams += streamCount;
    totalFields += fieldCount;

    console.log(
      `  ${pkg}: ${streamCount} data stream(s), ${fieldCount} field(s) -> ${configPath}`
    );
  }

  console.log(`\nDone. ${packages.length} configs, ${totalStreams} streams, ${totalFields} fields.`);
};

main();
