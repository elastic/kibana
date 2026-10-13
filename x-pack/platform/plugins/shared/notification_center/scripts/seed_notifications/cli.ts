/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Notification } from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../../server/storage/notification_data_stream';
import { buildChunk, buildTick, validateFixture } from './fixtures';
import {
  clearNotifications,
  clearReadHorizon,
  createDataStream,
  createEsClient,
  setReadHorizon,
  writeNotifications,
  type SeedTarget,
} from './seed';

const MIN_INTERVAL_MS = 1000;
/** Longer delays overflow `setTimeout`, which then fires immediately. */
const MAX_INTERVAL_MS = 2_147_483_647;

const DEFAULT_READ_HORIZON = '30d';

const UNIT_MS = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

/** Parse `500ms` / `10s` / `2m` / `12h` / `30d`; a bare number takes `defaultUnit`. */
const parseDuration = (raw: string, defaultUnit: keyof typeof UNIT_MS): number | undefined => {
  const match = /^(\d+)(ms|s|m|h|d)?$/.exec(raw.trim());
  if (!match) {
    return undefined;
  }
  const ms = Number(match[1]) * UNIT_MS[(match[2] ?? defaultUnit) as keyof typeof UNIT_MS];
  return Number.isSafeInteger(ms) ? ms : undefined;
};

const parseInterval = (raw: string): number => {
  const ms = parseDuration(raw, 's');
  if (ms === undefined || ms < MIN_INTERVAL_MS || ms > MAX_INTERVAL_MS) {
    throw createFlagError(
      `--interval must be between ${MIN_INTERVAL_MS}ms and ${MAX_INTERVAL_MS}ms. Use e.g. 1s, 10s or 2m.`
    );
  }
  return ms;
};

/** Parse an age (`30d`) or an absolute date (`2026-09-01`) into a timestamp. */
const parseReadHorizon = (raw: string): string => {
  const age = parseDuration(raw, 'd');
  if (age !== undefined) {
    return new Date(Date.now() - age).toISOString();
  }
  const parsed = Date.parse(raw.trim());
  if (Number.isNaN(parsed)) {
    throw createFlagError(
      `Could not parse --read-horizon "${raw}". Use e.g. 30d, 12h or 2026-09-01.`
    );
  }
  return new Date(parsed).toISOString();
};

const requiredUrl = (flags: Record<string, unknown>, flag: string): string => {
  const value = flags[flag];
  if (typeof value !== 'string' || value === '') {
    throw createFlagError(`--${flag} is required.`);
  }
  return value.replace(/\/$/, '');
};

const formatLine = (notification: Notification) =>
  `  ${notification.severity.padEnd(8)} ${notification.notification_id}`;

/** Emit one notification per interval until the process is interrupted. */
const runCadence = async (esClient: Client, intervalMs: number, log: ToolingLog): Promise<void> => {
  log.info(`Emitting one notification every ${intervalMs}ms. Press Ctrl-C to stop.`);

  for (let tick = 0; ; tick++) {
    const notification = buildTick(tick);
    validateFixture(notification);
    await writeNotifications(esClient, [notification]);
    log.info(formatLine(notification));
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

run(
  async ({ log, flags, addCleanupTask }) => {
    const target: SeedTarget = {
      kibanaUrl: requiredUrl(flags, 'kibana-url'),
      esUrl: requiredUrl(flags, 'es-url'),
      username: String(flags['es-username'] || 'elastic'),
      password: String(flags['es-password'] || 'changeme'),
    };
    const intervalMs = flags.interval ? parseInterval(String(flags.interval)) : undefined;
    const readHorizon = parseReadHorizon(String(flags['read-horizon'] || DEFAULT_READ_HORIZON));

    const esClient = createEsClient(target);
    addCleanupTask(() => {
      void esClient.close();
    });
    await createDataStream(target);

    if (flags.clean === true) {
      log.info(`Deleted ${await clearNotifications(esClient)} notification(s).`);
      await clearReadHorizon(target);
      return;
    }

    const chunk = buildChunk({ includeUnregistered: flags['include-unregistered'] === true });
    chunk.forEach(validateFixture);
    await writeNotifications(esClient, chunk);
    await setReadHorizon(target, readHorizon);

    log.info(`Seeded ${chunk.length} notification(s), unread since ${readHorizon}:`);
    chunk.forEach((notification) => log.info(formatLine(notification)));
    log.info('View them in Dev Console via:');
    log.info(`GET /${NOTIFICATION_DATA_STREAM_NAME}/_search`);

    if (intervalMs) {
      await runCadence(esClient, intervalMs, log);
    }
  },
  {
    description: `
      Seed the Notification Center data stream on a local dev stack.

      Assumes Kibana is already running with "xpack.notificationCenter.enabled: true", and that
      --kibana-url and --es-url name the same cluster.
    `,
    flags: {
      string: ['interval', 'es-url', 'es-username', 'es-password', 'kibana-url', 'read-horizon'],
      boolean: ['clean', 'include-unregistered'],
      help: `
        --kibana-url <url>       Required. Kibana base URL, including any base path
        --es-url <url>           Required. Elasticsearch URL of that Kibana's cluster
        --es-username <user>     Username for both (default: elastic)
        --es-password <pass>     Password for both (default: changeme)
        --clean                  Empty the data stream, reset read state, and exit
        --include-unregistered   Also seed namespaces no plugin has registered yet, plus one
                                 timeseries id. These bypass the producer contract and exist to
                                 exercise the read path and UI against a mixed feed.
        --interval <duration>    After seeding, keep emitting one notification per interval
                                 (e.g. 1s, 10s, 2m) until interrupted
        --read-horizon <when>    Backdate the seeded user's "mark all read" marker to an age
                                 (30d, 12h) or a date (2026-09-01), so the fixtures newer than it
                                 arrive unread (default: ${DEFAULT_READ_HORIZON})
      `,
    },
  }
);
