/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readConfig, validatePackage, listPackagesWithDashboards } from './engine';

const main = () => {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const packages = isAll
    ? listPackagesWithDashboards()
    : args.filter((a) => !a.startsWith('--'));

  if (packages.length === 0) {
    console.log('Usage: npx ts-node validate.ts <package> [<package2> ...] | --all');
    process.exit(1);
  }

  console.log(`Validating ${packages.length} package(s)...\n`);

  let totalPass = 0;
  let totalFail = 0;
  let totalMissing = 0;
  const failedPackages: string[] = [];

  for (const pkg of packages) {
    const config = readConfig(pkg);
    if (!config) {
      console.log(`  ${pkg}: no config found`);
      totalMissing++;
      continue;
    }

    if (config.dataStreams.length === 0) {
      console.log(`  ${pkg}: no data streams, skipping`);
      continue;
    }

    const results = validatePackage(config);
    const issues = results.filter(
      (r) => r.missingFields.length > 0 || r.filterIssues.length > 0
    );

    if (issues.length === 0) {
      const summary = results.map((r) => `${r.dataset}(${r.docCount}/${r.totalFields}f)`).join(', ');
      console.log(`  ${pkg}: PASS [${summary}]`);
      totalPass++;
    } else {
      totalFail++;
      failedPackages.push(pkg);
      console.log(`  ${pkg}: FAIL`);
      for (const r of results) {
        if (r.missingFields.length > 0 || r.filterIssues.length > 0) {
          console.log(`    ${r.dataset}: ${r.docCount} docs, ${r.presentFields}/${r.totalFields} fields`);
          if (r.missingFields.length > 0) {
            console.log(`      missing: ${r.missingFields.join(', ')}`);
          }
          for (const issue of r.filterIssues) {
            console.log(`      filter: ${issue}`);
          }
        }
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Pass: ${totalPass}, Fail: ${totalFail}, No config: ${totalMissing}`);
  if (failedPackages.length > 0) {
    console.log(`Failed: ${failedPackages.join(', ')}`);
  }

  process.exit(totalFail > 0 ? 1 : 0);
};

main();
