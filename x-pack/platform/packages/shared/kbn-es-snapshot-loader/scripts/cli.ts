/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { createKibanaClient, toolingLogToLogger } from '@kbn/kibana-api-cli';
import type { ToolingLog } from '@kbn/tooling-log';
import { format, parse } from 'node:url';
import { restoreSnapshot } from '../src/restore';
import { replaySnapshot } from '../src/replay';
import { DEFAULT_DATA_STREAM_PATTERNS } from '../src/types';

interface CommonFlags {
  'snapshot-url'?: string;
  'kibana-url'?: string;
  'es-url'?: string;
}

function parseCommaSeparatedList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function createEsClientFromUrl(esUrl: string): Client {
  const parsed = parse(esUrl, true);
  const [username, password] = (parsed.auth ?? '').split(':');

  return new Client({
    node: format({ ...parsed, auth: null }),
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

async function getEsClient(
  flags: CommonFlags,
  log: Parameters<typeof toolingLogToLogger>[0]['log']
): Promise<Client> {
  const { 'es-url': esUrl, 'kibana-url': kibanaUrl } = flags;
  if (esUrl) return createEsClientFromUrl(esUrl);
  return createEsClientFromKibana({ kibanaUrl, log, signal: new AbortController().signal });
}

const COMMON_FLAGS_HELP = `
    --snapshot-url      URL to the snapshot directory (required)
                        Currently only file:// URLs are supported
                        Example: file:///path/to/snapshot

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
      const { 'snapshot-url': snapshotUrl, indices: indicesFlag } = flags as CommonFlags & {
        indices?: string;
      };

      if (!snapshotUrl) throw new Error('--snapshot-url is required');

      const esClient = await getEsClient(flags as CommonFlags, log);
      const indices = parseCommaSeparatedList(indicesFlag);
      const logger = toolingLogToLogger({ flags, log });

      log.info(`Snapshot Restore`);
      log.info(`================`);
      log.info(`Snapshot URL: ${snapshotUrl}`);
      if (indices) log.info(`Index patterns: ${indices.join(', ')}`);
      log.info('');

      const result = await restoreSnapshot({ esClient, logger, snapshotUrl, indices });

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
        string: ['snapshot-url', 'kibana-url', 'es-url', 'indices'],
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
        'snapshot-url': snapshotUrl,
        patterns: patternsFlag,
        concurrency: concurrencyFlag,
      } = flags as CommonFlags & {
        patterns?: string;
        concurrency?: string;
      };

      if (!snapshotUrl) throw new Error('--snapshot-url is required');

      const esClient = await getEsClient(flags as CommonFlags, log);
      const patterns = parseCommaSeparatedList(patternsFlag) ?? DEFAULT_DATA_STREAM_PATTERNS;
      const concurrency = concurrencyFlag ? parseInt(concurrencyFlag, 10) : undefined;
      if (concurrencyFlag && (isNaN(concurrency!) || concurrency! < 1)) {
        throw new Error('--concurrency must be a positive integer');
      }
      const logger = toolingLogToLogger({ flags, log });

      log.info(`Snapshot Replay`);
      log.info(`===============`);
      log.info(`Snapshot URL: ${snapshotUrl}`);
      log.info(`Index patterns: ${patterns.join(', ')}`);
      if (concurrency) log.info(`Concurrency: ${concurrency}`);
      log.info('');

      const result = await replaySnapshot({ esClient, logger, snapshotUrl, patterns, concurrency });

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
        string: ['snapshot-url', 'kibana-url', 'es-url', 'patterns', 'concurrency'],
        help: `
      Usage: node scripts/es_snapshot_loader replay [options]
      ${COMMON_FLAGS_HELP}
      --patterns          Comma-separated data stream patterns to replay
                          Default: logs-*,metrics-*,traces-*

      --concurrency       Number of indices to reindex in parallel
                          Default: all indices at once (no limit)
        `,
        default: { patterns: DEFAULT_DATA_STREAM_PATTERNS.join(',') },
        allowUnexpected: false,
      },
    }
  );
}
