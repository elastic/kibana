/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  analyzePackage,
  writeConfig,
  readConfig,
  generatePackage,
  validatePackage,
  listPackagesWithDashboards,
  hasExistingSampleData,
} from './engine';

const BATCH_SIZE = 10;

const main = () => {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const analyzeOnly = args.includes('--analyze-only');
  const generateOnly = args.includes('--generate-only');
  const validateOnly = args.includes('--validate-only');
  const named = args.filter((a) => !a.startsWith('--'));
  const packages = named.length > 0 ? named : listPackagesWithDashboards();

  console.log(`\n=== All-Package Data Generation ===`);
  console.log(`Packages: ${packages.length}, Force: ${force}\n`);

  // Phase 1: Analyze
  if (!generateOnly && !validateOnly) {
    console.log(`--- Phase 1: Analyze ---`);
    let analyzed = 0;
    for (const pkg of packages) {
      const config = analyzePackage(pkg);
      writeConfig(config);
      analyzed++;
      if (analyzed % 50 === 0) console.log(`  analyzed ${analyzed}/${packages.length}...`);
    }
    console.log(`  ${analyzed} configs written.\n`);
  }

  if (analyzeOnly) {
    console.log('Done (analyze only).');
    return;
  }

  // Phase 2: Generate (in batches)
  if (!validateOnly) {
    console.log(`--- Phase 2: Generate ---`);
    let generated = 0;
    let skipped = 0;
    let errors = 0;
    let totalDocs = 0;

    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);
      for (const pkg of batch) {
        if (!force && hasExistingSampleData(pkg)) {
          skipped++;
          continue;
        }

        const config = readConfig(pkg);
        if (!config || config.dataStreams.length === 0) {
          skipped++;
          continue;
        }

        try {
          const results = generatePackage(config);
          const docCount = results.reduce((sum, r) => sum + r.count, 0);
          totalDocs += docCount;
          generated++;
        } catch (err: any) {
          console.error(`  ${pkg}: ERROR - ${err.message}`);
          errors++;
        }
      }

      console.log(
        `  batch ${Math.floor(i / BATCH_SIZE) + 1}: generated ${generated}, skipped ${skipped}, errors ${errors}, docs ${totalDocs}`
      );
    }

    console.log(`  Total: ${generated} generated, ${skipped} skipped, ${errors} errors, ${totalDocs} docs.\n`);
  }

  if (generateOnly) {
    console.log('Done (generate only).');
    return;
  }

  // Phase 3: Validate
  console.log(`--- Phase 3: Validate ---`);
  let pass = 0;
  let fail = 0;
  let noConfig = 0;
  const failedPkgs: string[] = [];

  for (const pkg of packages) {
    const config = readConfig(pkg);
    if (!config || config.dataStreams.length === 0) {
      noConfig++;
      continue;
    }

    const results = validatePackage(config);
    const issues = results.filter((r) => r.missingFields.length > 0 || r.filterIssues.length > 0);

    if (issues.length === 0) {
      pass++;
    } else {
      fail++;
      failedPkgs.push(pkg);
    }
  }

  console.log(`  Pass: ${pass}, Fail: ${fail}, No config: ${noConfig}`);
  if (failedPkgs.length > 0) {
    console.log(`  Failed packages:\n    ${failedPkgs.join('\n    ')}`);
  }

  console.log('\n=== Done ===');
};

main();
