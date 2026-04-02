/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { createKibanaClient } from '@kbn/kibana-api-cli';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createFsRepository,
  createGcsRepository,
  createUrlRepository,
  type RepositoryStrategy,
} from '../src/repository';
import { createSnapshot } from '../src/create';
import { restoreSnapshot } from '../src/restore';
import { replaySnapshot } from '../src/replay';

interface CommonFlags {
  'snapshot-url'?: string;
  'snapshot-name'?: string;
  'kibana-url'?: string;
  'es-url'?: string;
  'es-api-key'?: string;
  'repo-type'?: string;
  'gcs-bucket'?: string;
  'gcs-base-path'?: string;
  'gcs-client'?: string;
  'fs-location'?: string;
  'fs-compress'?: boolean;
}

function parseCommaSeparatedList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function createEsClientFromUrl(esUrl: string, apiKey?: string): Client {
  const url = new URL(esUrl);
  const username = url.username;
  const password = url.password;

  return new Client({
    node: `${url.protocol}//${url.host}${url.pathname}`,
    auth: apiKey ? { apiKey } : username && password ? { username, password } : undefined,
  });
}

async function createEsClientFromKibana({
  kibanaUrl,
  log,
  signal,
}: {
  kibanaUrl?: string;
  log: ToolingLog;
  signal: AbortSignal;
}): Promise<Client> {
  const kibanaClient = await createKibanaClient({
    log,
    signal,
    baseUrl: kibanaUrl,
  });
  return kibanaClient.es;
}

async function getEsClient(flags: CommonFlags, log: ToolingLog): Promise<Client> {
  const { 'es-url': esUrl, 'es-api-key': esApiKey, 'kibana-url': kibanaUrl } = flags;

  if (esApiKey && !esUrl) {
    throw new Error(
      '--es-api-key requires --es-url. API key auth is not supported when connecting through Kibana (--kibana-url).'
    );
  }

  if (esUrl) return createEsClientFromUrl(esUrl, esApiKey);
  return createEsClientFromKibana({ kibanaUrl, log, signal: new AbortController().signal });
}

function resolveRepositoryFromFlags(flags: CommonFlags): RepositoryStrategy {
  const snapshotUrl = flags['snapshot-url'];
  const repoTypeFlag = flags['repo-type'];
  const repoType =
    typeof repoTypeFlag === 'string' && repoTypeFlag.length > 0 ? repoTypeFlag : 'url';
  const gcsBucket = flags['gcs-bucket'];
  const gcsBasePath = flags['gcs-base-path'];
  const gcsClient = flags['gcs-client'];
  const fsLocation = flags['fs-location'];
  const fsCompress = flags['fs-compress'];

  if (repoType !== 'url' && repoType !== 'gcs' && repoType !== 'fs') {
    throw new Error(`--repo-type must be one of: url, gcs, fs`);
  }

  const hasGcsFlag = Boolean(gcsBucket || gcsBasePath || gcsClient);
  const hasFsFlag = Boolean(fsLocation || fsCompress);
  if (hasFsFlag && repoType !== 'fs') {
    throw new Error('--fs-* flags require --repo-type fs');
  }
  if (hasGcsFlag && repoType !== 'gcs') {
    throw new Error('--gcs-* flags require --repo-type gcs');
  }

  if (repoType === 'gcs' && !gcsBucket) {
    throw new Error('--gcs-bucket is required when using --repo-type gcs');
  }
  if (repoType === 'fs' && !fsLocation) {
    throw new Error('--fs-location is required when using --repo-type fs');
  }

  if (repoType === 'gcs') {
    return createGcsRepository({
      bucket: gcsBucket!,
      basePath: gcsBasePath,
      client: gcsClient,
    });
  }
  if (repoType === 'fs') {
    return createFsRepository({
      location: fsLocation!,
      compress: fsCompress,
    });
  }

  if (!snapshotUrl) {
    throw new Error('--snapshot-url is required unless using --repo-type gcs or fs');
  }

  return createUrlRepository(snapshotUrl);
}

const COMMON_FLAGS_HELP = `
    --repo-type         Repository type to use
                        Options: url, gcs, fs
                        Default: url

    --snapshot-url      URL to the snapshot directory (for --repo-type url)
                        Supports file:// URLs
                        Example: file:///path/to/snapshot

    --gcs-bucket        GCS bucket name (required for --repo-type gcs)

    --gcs-base-path     Optional base path within the GCS bucket

    --gcs-client        Optional Elasticsearch GCS client name
                        Requires target Elasticsearch GCS client credentials
                        pre-configured in keystore

    --fs-location       Filesystem snapshot path (required for --repo-type fs)
                        Target Elasticsearch must allow this path in path.repo

    --fs-compress       Enable compression for fs repository snapshots

                        Cannot use both --snapshot-url and --gcs-* flags
                        Cannot use both --snapshot-url and --fs-* flags
                        Cannot use both --gcs-* and --fs-* flags

    --snapshot-name     Snapshot name to restore/replay
                        Default: latest SUCCESS snapshot in the repository

    --es-url            Elasticsearch URL with credentials
                        Example: http://elastic:changeme@localhost:9200

    --es-api-key        Elasticsearch API key (base64 encoded)
                        When provided, overrides credentials in --es-url

    --kibana-url        Kibana URL (ES requests proxied through Kibana)
                        Example: http://localhost:5601
`;

const USAGE_HELP = `
ES Snapshot Loader - Load Elasticsearch snapshots for testing

Usage: node scripts/es_snapshot_loader <command> [options]

Commands:
  create     Create a snapshot in a writable repository (gcs/fs)
  restore    Restore a snapshot directly to Elasticsearch
             Supports index renaming (--rename-pattern/--rename-replacement)
             and graceful no-match handling (--allow-no-matches)
  replay     Restore a snapshot with timestamp transformation for data streams

Run 'node scripts/es_snapshot_loader <command> --help' for more information.
`;

export function runCli(): void {
  const subcommand = process.argv[2];

  if (subcommand === 'create') {
    runCreateCli();
  } else if (subcommand === 'restore') {
    runRestoreCli();
  } else if (subcommand === 'replay') {
    runReplayCli();
  } else {
    process.stdout.write(USAGE_HELP);
    process.exit(subcommand === '--help' || subcommand === '-h' ? 0 : 1);
  }
}

function runCreateCli(): void {
  process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(3)];

  run(
    async ({ log, flags }) => {
      const {
        'snapshot-name': snapshotName,
        indices: indicesFlag,
        'ignore-unavailable': ignoreUnavailable,
      } = flags as CommonFlags & {
        indices?: string;
        'ignore-unavailable'?: boolean;
      };

      if (!snapshotName) {
        throw new Error('--snapshot-name is required');
      }

      const repository = resolveRepositoryFromFlags(flags as CommonFlags);
      if (repository.type === 'url') {
        throw new Error('URL repositories are read-only and do not support snapshot creation');
      }

      const esClient = await getEsClient(flags as CommonFlags, log);
      const indices = parseCommaSeparatedList(indicesFlag);

      log.info(`Snapshot Create`);
      log.info(`===============`);
      log.info(`Repository type: ${repository.type}`);
      log.info(`Snapshot name: ${snapshotName}`);
      if (indices) log.info(`Index patterns: ${indices.join(', ')}`);
      if (ignoreUnavailable) log.info(`Ignore unavailable: true`);

      const result = await createSnapshot({
        esClient,
        log,
        repository,
        snapshotName,
        indices,
        ignoreUnavailable,
      });

      if (result.success) {
        log.success(`Snapshot creation completed successfully`);
        log.info(`Snapshot: ${result.snapshotName}`);
        log.info(`Captured indices: ${result.indices.length}`);
        result.indices.forEach((idx) => log.info(`  - ${idx}`));
      } else {
        result.errors.forEach((err) => log.error(`  ${err}`));
        throw new Error(`Snapshot creation failed: ${result.errors.join('; ')}`);
      }
    },
    {
      description: 'Create an Elasticsearch snapshot in a writable repository',
      flags: {
        string: [
          'repo-type',
          'snapshot-url',
          'snapshot-name',
          'kibana-url',
          'es-url',
          'es-api-key',
          'gcs-bucket',
          'gcs-base-path',
          'gcs-client',
          'fs-location',
          'indices',
        ],
        boolean: ['ignore-unavailable', 'fs-compress'],
        help: `
      Usage: node scripts/es_snapshot_loader create [options]
      ${COMMON_FLAGS_HELP}
      --indices             Comma-separated index patterns to snapshot
                            Default: all indices

      --ignore-unavailable  Ignore missing indices while creating snapshot

      Notes:
        --snapshot-name is required for create
        --repo-type url is not supported for create (read-only repository type)
        `,
        allowUnexpected: false,
      },
    }
  );
}

function runRestoreCli(): void {
  process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(3)];

  run(
    async ({ log, flags }) => {
      const {
        'snapshot-name': snapshotName,
        indices: indicesFlag,
        'rename-pattern': renamePattern,
        'rename-replacement': renameReplacement,
        'allow-no-matches': allowNoMatches,
      } = flags as CommonFlags & {
        indices?: string;
        'rename-pattern'?: string;
        'rename-replacement'?: string;
        'allow-no-matches'?: boolean;
      };

      const repository = resolveRepositoryFromFlags(flags as CommonFlags);
      const esClient = await getEsClient(flags as CommonFlags, log);
      const indices = parseCommaSeparatedList(indicesFlag);

      log.info(`Snapshot Restore`);
      log.info(`================`);
      log.info(`Repository type: ${repository.type}`);
      if (snapshotName) log.info(`Snapshot name: ${snapshotName}`);
      if (indices) log.info(`Index patterns: ${indices.join(', ')}`);
      if (renamePattern) log.info(`Rename pattern: ${renamePattern} → ${renameReplacement}`);
      if (allowNoMatches) log.info(`Allow no matches: true`);

      const result = await restoreSnapshot({
        esClient,
        log,
        repository,
        snapshotName,
        indices,
        renamePattern,
        renameReplacement,
        allowNoMatches,
      });

      if (result.success) {
        log.success(`Snapshot restore completed successfully`);
        log.info(`Snapshot: ${result.snapshotName}`);
        log.info(`Restored indices: ${result.restoredIndices.length}`);
        result.restoredIndices.forEach((idx) => log.info(`  - ${idx}`));
      } else {
        result.errors.forEach((err) => log.error(`  ${err}`));
        throw new Error(`Snapshot restore failed: ${result.errors.join('; ')}`);
      }
    },
    {
      description: 'Restore an Elasticsearch snapshot directly',
      flags: {
        string: [
          'repo-type',
          'snapshot-url',
          'snapshot-name',
          'kibana-url',
          'es-url',
          'es-api-key',
          'gcs-bucket',
          'gcs-base-path',
          'gcs-client',
          'fs-location',
          'indices',
          'rename-pattern',
          'rename-replacement',
        ],
        boolean: ['allow-no-matches', 'fs-compress'],
        help: `
      Usage: node scripts/es_snapshot_loader restore [options]
      ${COMMON_FLAGS_HELP}
      --indices             Comma-separated index patterns to restore

      --rename-pattern      Regex pattern for renaming restored indices
                            (ES rename_pattern). Must be used with --rename-replacement.
                            Example: (.+)

      --rename-replacement  Replacement string for renamed indices
                            (ES rename_replacement). Must be used with --rename-pattern.
                            Example: tmp-$1

      --allow-no-matches    When set, a restore that matches no indices succeeds
                            silently instead of throwing an error
        `,
        allowUnexpected: false,
      },
    }
  );
}

function runReplayCli(): void {
  process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(3)];

  run(
    async ({ log, flags }) => {
      const {
        'snapshot-name': snapshotName,
        patterns: patternsFlag,
        concurrency: concurrencyFlag,
      } = flags as CommonFlags & {
        patterns?: string;
        concurrency?: string;
      };

      const repository = resolveRepositoryFromFlags(flags as CommonFlags);
      if (!parseCommaSeparatedList(patternsFlag)) {
        throw new Error('--patterns is required');
      }

      const esClient = await getEsClient(flags as CommonFlags, log);
      const patterns = parseCommaSeparatedList(patternsFlag)!;
      const concurrency = concurrencyFlag ? parseInt(concurrencyFlag, 10) : undefined;
      if (concurrencyFlag && (isNaN(concurrency!) || concurrency! < 1)) {
        throw new Error('--concurrency must be a positive integer');
      }

      log.info(`Snapshot Replay`);
      log.info(`===============`);
      log.info(`Repository type: ${repository.type}`);
      if (snapshotName) log.info(`Snapshot name: ${snapshotName}`);
      log.info(`Index patterns: ${patterns.join(', ')}`);
      if (concurrency) log.info(`Concurrency: ${concurrency}`);

      const result = await replaySnapshot({
        esClient,
        log,
        repository,
        snapshotName,
        patterns,
        concurrency,
      });

      if (result.success) {
        log.success(`Snapshot replay completed successfully`);
        log.info(`Snapshot: ${result.snapshotName}`);
        log.info(`Max timestamp: ${result.maxTimestamp}`);
        log.info(`Reindexed indices: ${result.reindexedIndices?.length ?? 0}`);
        result.reindexedIndices?.forEach((idx) => log.info(`  - ${idx}`));
      } else {
        result.errors.forEach((err) => log.error(`  ${err}`));
        throw new Error(`Snapshot replay failed: ${result.errors.join('; ')}`);
      }
    },
    {
      description:
        'Replay an Elasticsearch snapshot with timestamp transformation for data streams',
      flags: {
        string: [
          'repo-type',
          'snapshot-url',
          'snapshot-name',
          'kibana-url',
          'es-url',
          'es-api-key',
          'gcs-bucket',
          'gcs-base-path',
          'gcs-client',
          'fs-location',
          'patterns',
          'concurrency',
        ],
        boolean: ['fs-compress'],
        help: `
      Usage: node scripts/es_snapshot_loader replay [options]
      ${COMMON_FLAGS_HELP}
      --patterns          Comma-separated data stream patterns to replay (required)

      --concurrency       Number of indices to reindex in parallel
                          Default: all indices at once (no limit)
        `,
        allowUnexpected: false,
      },
    }
  );
}
