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
  createGcsRepository,
  createUrlRepository,
  type RepositoryStrategy,
} from '../src/repository';
import { restoreSnapshot } from '../src/restore';
import { replaySnapshot } from '../src/replay';

interface CommonFlags {
  'snapshot-url'?: string;
  'snapshot-name'?: string;
  'kibana-url'?: string;
  'es-url'?: string;
  'repo-type'?: string;
  'gcs-bucket'?: string;
  'gcs-base-path'?: string;
  'gcs-client'?: string;
}

function parseCommaSeparatedList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function createEsClientFromUrl(esUrl: string): Client {
  const url = new URL(esUrl);
  const username = url.username;
  const password = url.password;

  return new Client({
    node: `${url.protocol}//${url.host}${url.pathname}`,
    auth: username && password ? { username, password } : undefined,
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
  const { 'es-url': esUrl, 'kibana-url': kibanaUrl } = flags;
  if (esUrl) return createEsClientFromUrl(esUrl);
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

  if (repoType !== 'url' && repoType !== 'gcs') {
    throw new Error(`--repo-type must be one of: url, gcs`);
  }

  const hasGcsFlag = Boolean(gcsBucket || gcsBasePath || gcsClient);
  if (hasGcsFlag && snapshotUrl) {
    throw new Error('Cannot use both --snapshot-url and --gcs-* flags');
  }

  if (repoType === 'gcs' && !gcsBucket) {
    throw new Error('--gcs-bucket is required when using --repo-type gcs');
  }

  if (gcsBucket || repoType === 'gcs') {
    return createGcsRepository({
      bucket: gcsBucket!,
      basePath: gcsBasePath,
      client: gcsClient,
    });
  }

  if (!snapshotUrl) {
    throw new Error('--snapshot-url is required unless using --repo-type gcs');
  }

  return createUrlRepository(snapshotUrl);
}

const COMMON_FLAGS_HELP = `
    --repo-type         Repository type to use
                        Options: url, gcs
                        Default: url

    --snapshot-url      URL to the snapshot directory (for --repo-type url)
                        Supports file:// URLs
                        Example: file:///path/to/snapshot

    --gcs-bucket        GCS bucket name (required for --repo-type gcs)

    --gcs-base-path     Optional base path within the GCS bucket

    --gcs-client        Optional Elasticsearch GCS client name

                        Cannot use both --snapshot-url and --gcs-* flags

    --snapshot-name     Snapshot name to restore/replay
                        Default: latest SUCCESS snapshot in the repository

    --es-url            Elasticsearch URL with credentials
                        Example: http://elastic:changeme@localhost:9200

    --kibana-url        Kibana URL (ES requests proxied through Kibana)
                        Example: http://localhost:5601
`;

const USAGE_HELP = `
ES Snapshot Loader - Load Elasticsearch snapshots for testing

Usage: node scripts/es_snapshot_loader <command> [options]

Commands:
  restore    Restore a snapshot directly to Elasticsearch
  replay     Restore a snapshot with timestamp transformation for data streams

Run 'node scripts/es_snapshot_loader <command> --help' for more information.
`;

export function runCli(): void {
  const subcommand = process.argv[2];

  if (subcommand === 'restore') {
    runRestoreCli();
  } else if (subcommand === 'replay') {
    runReplayCli();
  } else {
    process.stdout.write(USAGE_HELP);
    process.exit(subcommand === '--help' || subcommand === '-h' ? 0 : 1);
  }
}

function runRestoreCli(): void {
  process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(3)];

  run(
    async ({ log, flags }) => {
      const { 'snapshot-name': snapshotName, indices: indicesFlag } = flags as CommonFlags & {
        indices?: string;
      };

      const repository = resolveRepositoryFromFlags(flags as CommonFlags);
      const esClient = await getEsClient(flags as CommonFlags, log);
      const indices = parseCommaSeparatedList(indicesFlag);

      log.info(`Snapshot Restore`);
      log.info(`================`);
      log.info(`Repository type: ${repository.type}`);
      if (snapshotName) log.info(`Snapshot name: ${snapshotName}`);
      if (indices) log.info(`Index patterns: ${indices.join(', ')}`);

      const result = await restoreSnapshot({
        esClient,
        log,
        repository,
        snapshotName,
        indices,
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
          'gcs-bucket',
          'gcs-base-path',
          'gcs-client',
          'indices',
        ],
        help: `
      Usage: node scripts/es_snapshot_loader restore [options]
      ${COMMON_FLAGS_HELP}
      --indices             Comma-separated index patterns to restore
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
          'gcs-bucket',
          'gcs-base-path',
          'gcs-client',
          'patterns',
          'concurrency',
        ],
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
