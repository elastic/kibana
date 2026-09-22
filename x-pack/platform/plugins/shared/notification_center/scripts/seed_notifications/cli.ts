/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Notification } from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../../server/storage/notification_data_stream';
import { buildChunk, buildTick, validateFixture } from './fixtures';
import { createEsClient, getConnection } from './lib/connection';
import { clearNotifications, ensureDataStream, writeNotifications } from './lib/notification_store';

const MIN_INTERVAL_MS = 1000;

const UNIT_MS = { ms: 1, s: 1000, m: 60_000 } as const;

/** Parse `1s` / `10s` / `2m`; a bare number is seconds. */
const parseInterval = (raw: string): number => {
  const match = /^(\d+)(ms|s|m)?$/.exec(raw.trim());
  if (!match) {
    throw new Error(`Could not parse --interval "${raw}". Use e.g. 1s, 10s or 2m.`);
  }
  const unit = (match[2] ?? 's') as keyof typeof UNIT_MS;
  const ms = Number(match[1]) * UNIT_MS[unit];
  if (!Number.isSafeInteger(ms) || ms > 2_147_483_647) {
    throw new Error('--interval is too large.');
  }
  if (ms < MIN_INTERVAL_MS) {
    throw new Error(`--interval must be at least ${MIN_INTERVAL_MS}ms.`);
  }
  return ms;
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
    const intervalMs = flags.interval ? parseInterval(String(flags.interval)) : undefined;
    const connection = await getConnection(flags, log);
    const { esUrl, kibanaUrl } = connection;

    log.info(`Kibana ${kibanaUrl} — Elasticsearch ${esUrl}`);

    const esClient = createEsClient(connection);
    addCleanupTask(() => {
      void esClient.close();
    });
    await ensureDataStream(connection, esClient, log);

    if (flags.clean === true) {
      const deleted = await clearNotifications(esClient);
      log.info(`Deleted ${deleted} existing notification(s).`);
      return;
    }

    const chunk = buildChunk({ includeUnregistered: flags['include-unregistered'] === true });
    chunk.forEach(validateFixture);
    await writeNotifications(esClient, chunk);

    log.info(`Seeded ${chunk.length} notification(s):`);
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

      Requires a running Kibana with "xpack.notificationCenter.enabled: true"
    `,
    flags: {
      string: ['interval', 'es-url', 'es-username', 'es-password', 'kibana-url'],
      boolean: ['clean', 'include-unregistered'],
      help: `
        --clean                  Empty the data stream and exit
        --include-unregistered   Also seed namespaces no plugin has registered yet, plus one
                                 timeseries id. These bypass the producer contract and exist to
                                 exercise the read path and UI against a mixed feed.
        --interval <duration>    After seeding, keep emitting one notification per interval
                                 (e.g. 1s, 10s, 2m) until interrupted
        --es-url <url>           Elasticsearch URL (default: the cluster for that Kibana)
        --es-username <user>     Elasticsearch username (default: elastic_serverless or elastic)
        --es-password <pass>     Elasticsearch password (default: changeme)
        --kibana-url <url>       Kibana base URL, including any base path
                                 (default: localhost:5601 serverless or :5611 stack)
      `,
    },
  }
);
