/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors, type Client } from '@elastic/elasticsearch';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_NOTIFICATIONS_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../../common/routes';
import type { Notification } from '../../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../../../server/storage/notification_data_stream';
import type { SeedConnection } from './connection';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'seed-notifications',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': NOTIFICATION_CENTER_API_VERSION,
};

const isDataStream = async (esClient: Client): Promise<boolean> => {
  try {
    const { data_streams: dataStreams } = await esClient.indices.getDataStream({
      name: NOTIFICATION_DATA_STREAM_NAME,
    });
    return dataStreams.length > 0;
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      return false;
    }
    throw error;
  }
};

/**
 * Make the plugin create its data stream, by reading through it once.
 *
 * Writing first would let Elasticsearch auto-create a plain index under the data stream's
 * name, which then permanently blocks the plugin's own creation of it. The read doubles as a
 * check that the plugin is enabled and that the credentials work.
 */
export const ensureDataStream = async (
  connection: SeedConnection,
  esClient: Client,
  log: ToolingLog
): Promise<void> => {
  const alreadyCreated = await isDataStream(esClient);
  if (!alreadyCreated) {
    const plainIndex = await esClient.indices.exists({ index: NOTIFICATION_DATA_STREAM_NAME });
    if (plainIndex) {
      throw createFailError(
        `"${NOTIFICATION_DATA_STREAM_NAME}" exists as a plain index, which blocks the plugin ` +
          `from creating its data stream. Delete it first: DELETE /${NOTIFICATION_DATA_STREAM_NAME}`
      );
    }
  }

  const { username, password, kibanaUrl } = connection;
  const url = `${kibanaUrl}${GET_NOTIFICATIONS_PATH}`;
  const response = await fetch(url, {
    headers: {
      ...INTERNAL_HEADERS,
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    throw createFailError(`Could not reach Kibana at ${kibanaUrl}: ${message}`);
  });

  if (response.status === 404) {
    throw createFailError(
      `${url} returned 404. The Notification Center is disabled by default — add ` +
        `"xpack.notificationCenter.enabled: true" to config/kibana.dev.yml and restart Kibana.`
    );
  }
  if (!response.ok) {
    throw createFailError(`${url} returned ${response.status}: ${await response.text()}`);
  }

  // An unrecognised path yields the SPA shell with a 200, so confirm this is really the route.
  const body = await response.json().catch(() => undefined);
  if (!Array.isArray(body?.items)) {
    throw createFailError(`${url} did not return a notification list. Is --kibana-url correct?`);
  }

  log.debug(`Notification Center is serving ${url}`);

  if (!(await isDataStream(esClient))) {
    throw createFailError(
      `Kibana served the list route but "${NOTIFICATION_DATA_STREAM_NAME}" still does not exist ` +
        `on ${connection.esUrl}. Check the Kibana logs for a data stream creation failure.`
    );
  }
};

/** Append notifications the way the plugin does, and wait for them to become searchable. */
export const writeNotifications = async (
  esClient: Client,
  notifications: Notification[]
): Promise<void> => {
  const response = await esClient.bulk({
    refresh: true,
    operations: notifications.flatMap((notification) => [
      { create: { _index: NOTIFICATION_DATA_STREAM_NAME } },
      notification,
    ]),
  });

  if (response.errors) {
    const reason = response.items.find((item) => item.create?.error)?.create?.error?.reason;
    throw createFailError(`Failed to append notifications: ${reason ?? 'unknown error'}`);
  }
};

/** Delete every document in the data stream, including any a producer already wrote. */
export const clearNotifications = async (esClient: Client): Promise<number> => {
  const { deleted } = await esClient.deleteByQuery({
    index: NOTIFICATION_DATA_STREAM_NAME,
    refresh: true,
    conflicts: 'proceed',
    query: { match_all: {} },
  });
  return deleted ?? 0;
};
