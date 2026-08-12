/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * check_template_drift
 *
 * Verifies that a refactor of generateMappings has not changed its output by
 * generating one JSON file per package under an output directory. Each file
 * contains the IndexTemplateMappings for every data stream in that package.
 * Run it on two git checkouts and diff the directories:
 *
 *   node scripts/check_template_drift --outputDir /tmp/branch
 *   git checkout main
 *   node scripts/check_template_drift --outputDir /tmp/main
 *   diff -rq /tmp/main /tmp/branch
 *
 * Packages are processed one at a time (download → extract in memory →
 * compute mappings → discard zip buffer) so disk usage stays minimal.
 * If a package file already exists in the output directory it is skipped,
 * allowing interrupted runs to be resumed.
 *
 * Usage:
 *   node scripts/check_template_drift [options]
 *
 * Options:
 *   --registryUrl <url>    EPR base URL  (default: https://epr.elastic.co)
 *   --outputDir <path>     Output directory  (default: /tmp/template-drift)
 *   --filter <regex>       Only process packages matching this regex on their name
 *   --concurrency <n>      Parallel package downloads  (default: 8)
 *   --help                 Show this message
 */

import * as fs from 'fs';
import * as path from 'path';

import fetch from 'node-fetch';
import { parse as parseYaml } from 'yaml';
import pLimit from 'p-limit';
import { ToolingLog } from '@kbn/tooling-log';
import { kibanaPackageJson } from '@kbn/repo-info';

import { processFields } from '../../server/services/epm/fields/field';
import { generateMappings } from '../../server/services/epm/elasticsearch/template/template';
import { untarBuffer, unzipBuffer } from '../../server/services/epm/archive/extract';
import type { Field } from '../../server/services/epm/fields/field';

const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });

const argv = (() => {
  const args = process.argv.slice(2);
  const get = (flag: string, def?: string) => {
    const i = args.indexOf(flag);
    return i !== -1 && args[i + 1] ? args[i + 1] : def;
  };
  if (args.includes('--help')) {
    logger.info(`
  check_template_drift — compare generateMappings output across git checkouts

  Usage: node scripts/check_template_drift [options]

  --registryUrl <url>  EPR base URL  (default: https://epr.elastic.co)
  --outputDir <path>   Output directory  (default: /tmp/template-drift)
  --filter <regex>     Only packages whose name matches this regex
  --concurrency <n>    Parallel downloads  (default: 8)
  --help               Show this message
    `);
    process.exit(0);
  }
  return {
    registryUrl: get('--registryUrl', 'https://epr.elastic.co'),
    outputDir: get('--outputDir', '/tmp/template-drift'),
    filter: get('--filter'),
    concurrency: parseInt(get('--concurrency', '8')!, 10),
  };
})();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PackageRef {
  name: string;
  version: string;
  download: string;
}

interface DataStreamManifest {
  elasticsearch?: { index_mode?: string };
}

// Per-package output file: dataset name -> IndexTemplateMappings.
interface PackageOutput {
  __error?: string;
  [dataset: string]: unknown;
}

// ---------------------------------------------------------------------------
// EPR catalog
// ---------------------------------------------------------------------------

async function getAllPackages(): Promise<PackageRef[]> {
  const url = `${argv.registryUrl}/search?prerelease=true&kibana.version=${kibanaPackageJson.version}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPR catalog fetch failed: ${res.status} ${url}`);
  return res.json() as Promise<PackageRef[]>;
}

// ---------------------------------------------------------------------------
// Archive download + extraction
// ---------------------------------------------------------------------------

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Extracts all files from the package archive into a path->Buffer map, keeping
 * only data_stream manifests and fields YAML files.
 *
 * The entire archive is processed in memory and the Buffer is discarded
 * immediately after; nothing is written to disk.
 */
async function extractRelevantFiles(
  archiveBuffer: Buffer,
  downloadUrl: string
): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();

  // Integration packages:  <pkg>/data_stream/<dataset>/manifest.yml
  //                        <pkg>/data_stream/<dataset>/fields/<f>.yml
  // Input packages:        <pkg>/manifest.yml
  //                        <pkg>/fields/<f>.yml
  const isRelevant = (p: string) =>
    /\/data_stream\/[^/]+\/manifest\.yml$/.test(p) ||
    /\/data_stream\/[^/]+\/fields\/[^/]+\.yml$/.test(p) ||
    /^[^/]+\/manifest\.yml$/.test(p) ||
    /^[^/]+\/fields\/[^/]+\.yml$/.test(p);

  const onEntry = async ({ path: entryPath, buffer }: { path: string; buffer?: Buffer }) => {
    if (buffer && isRelevant(entryPath)) {
      files.set(entryPath, buffer);
    }
  };

  const isZip = downloadUrl.endsWith('.zip');
  if (isZip) {
    await unzipBuffer(archiveBuffer, ({ path: p }) => isRelevant(p), onEntry);
  } else {
    await untarBuffer(archiveBuffer, ({ path: p }) => isRelevant(p), onEntry);
  }

  return files;
}

// ---------------------------------------------------------------------------
// Mappings computation
// ---------------------------------------------------------------------------

/**
 * Given the extracted file map for one package, returns a record of
 * dataset → IndexTemplateMappings for every data stream in the package.
 */
function computeMappingsForPackage(files: Map<string, Buffer>): Record<string, unknown> {
  // Group entries by dataset key. Integration packages use
  // data_stream/<dataset> as the key; input packages use the package name
  // itself (represented here as the special key '__input__').
  const dataStreams = new Map<string, { manifestBuf?: Buffer; fieldBufs: Buffer[] }>();

  for (const [filePath, buf] of files) {
    // Integration: .../data_stream/<dataset>/manifest.yml
    const dsManifest = filePath.match(/\/data_stream\/([^/]+)\/manifest\.yml$/);
    if (dsManifest) {
      const ds = dsManifest[1];
      if (!dataStreams.has(ds)) dataStreams.set(ds, { fieldBufs: [] });
      dataStreams.get(ds)!.manifestBuf = buf;
      continue;
    }
    // Integration: .../data_stream/<dataset>/fields/<f>.yml
    const dsField = filePath.match(/\/data_stream\/([^/]+)\/fields\/[^/]+\.yml$/);
    if (dsField) {
      const ds = dsField[1];
      if (!dataStreams.has(ds)) dataStreams.set(ds, { fieldBufs: [] });
      dataStreams.get(ds)!.fieldBufs.push(buf);
      continue;
    }
    // Input package: <pkg>/manifest.yml (root-level)
    if (/^[^/]+\/manifest\.yml$/.test(filePath)) {
      if (!dataStreams.has('__input__')) dataStreams.set('__input__', { fieldBufs: [] });
      dataStreams.get('__input__')!.manifestBuf = buf;
      continue;
    }
    // Input package: <pkg>/fields/<f>.yml (root-level)
    if (/^[^/]+\/fields\/[^/]+\.yml$/.test(filePath)) {
      // Skip if this path was already captured as a data_stream field above
      // (shouldn't happen, but guard against double-counting on integration pkgs).
      if (!filePath.includes('/data_stream/')) {
        if (!dataStreams.has('__input__')) dataStreams.set('__input__', { fieldBufs: [] });
        dataStreams.get('__input__')!.fieldBufs.push(buf);
      }
    }
  }

  const result: Record<string, unknown> = {};

  for (const [dataset, { manifestBuf, fieldBufs }] of dataStreams) {
    // Skip the root manifest entry for integration packages — it has no fields.
    if (dataset === '__input__' && fieldBufs.length === 0) continue;

    let isTSDB = false;
    if (manifestBuf) {
      const manifest = parseYaml(manifestBuf.toString()) as DataStreamManifest | null;
      isTSDB = manifest?.elasticsearch?.index_mode === 'time_series';
    }

    const rawFields: Field[] = [];
    for (const buf of fieldBufs) {
      const parsed = parseYaml(buf.toString()) as Field[] | null;
      if (Array.isArray(parsed)) rawFields.push(...parsed);
    }

    const processed = processFields(rawFields);
    const outputKey = dataset === '__input__' ? '__input__' : dataset;
    result[outputKey] = generateMappings(processed, isTSDB);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

export async function run() {
  let packages = await getAllPackages();
  logger.info(`Fetched ${packages.length} packages from EPR`);

  if (argv.filter) {
    const re = new RegExp(argv.filter);
    packages = packages.filter((p) => re.test(p.name));
    logger.info(`Filtered to ${packages.length} packages matching /${argv.filter}/`);
  }

  const outDir = path.resolve(argv.outputDir!);
  fs.mkdirSync(outDir, { recursive: true });

  const limit = pLimit(argv.concurrency);
  let processed = 0;
  let errors = 0;
  let skipped = 0;

  await Promise.all(
    packages.map((pkg) =>
      limit(async () => {
        const label = `${pkg.name}@${pkg.version}`;
        const outFile = path.join(outDir, `${pkg.name}.json`);

        if (fs.existsSync(outFile)) {
          skipped++;
          processed++;
          return;
        }

        const pkgOutput: PackageOutput = {};
        try {
          const url = `${argv.registryUrl}${pkg.download}`;
          const buf = await downloadBuffer(url);
          const files = await extractRelevantFiles(buf, pkg.download);
          const mappings = computeMappingsForPackage(files);
          // Sort dataset keys for deterministic diff output.
          for (const dataset of Object.keys(mappings).sort()) {
            pkgOutput[dataset] = mappings[dataset];
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err);
          pkgOutput.__error = msg;
          errors++;
          logger.warning(`  SKIP ${label}: ${err instanceof Error ? err.message : msg}`);
        }

        fs.writeFileSync(outFile, JSON.stringify(pkgOutput, null, 2));
        processed++;
        if (processed % 20 === 0 || processed === packages.length) {
          logger.info(`  ${processed}/${packages.length} packages done`);
        }
      })
    )
  );

  logger.info(
    `Done. ${processed - skipped} processed, ${skipped} skipped (already existed), ` +
      `${errors} errors. Output: ${outDir}`
  );
}
