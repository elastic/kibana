/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { GET_NOTIFICATIONS_PATH, NOTIFICATION_CENTER_API_VERSION } from '../../common/routes';
import type { Notification } from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../../server/storage/notification_data_stream';
import { OVERRIDES_KEY, READ_ALL_BEFORE_KEY } from '../../server/storage/user_storage';

export interface SeedTarget {
  esUrl: string;
  kibanaUrl: string;
  username: string;
  password: string;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export const createEsClient = ({ esUrl, username, password }: SeedTarget): Client =>
  new Client({
    node: esUrl,
    auth: { username, password },
    // Serverless dev clusters serve a self-signed cert. Local only: a remote https cluster
    // reached over an unverified connection is nobody's intent.
    ...(esUrl.startsWith('https:') &&
      LOCAL_HOSTNAMES.has(new URL(esUrl).hostname) && { tls: { rejectUnauthorized: false } }),
  });

const HEADERS = {
  'kbn-xsrf': 'seed-notifications',
  'x-elastic-internal-origin': 'kibana',
  'content-type': 'application/json',
};

/**
 * Never send this alongside a session cookie: HTTP authentication wins over the session, and the
 * request loses the `profile_uid` that read state is keyed by.
 */
const basicAuth = ({ username, password }: SeedTarget) => ({
  authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
});

/**
 * Read the list route once, which is what makes the plugin create its data stream.
 *
 * Writing first lets Elasticsearch auto-create a plain index under the same name, which then
 * permanently blocks the plugin from creating it — hence the one status check here.
 */
export const createDataStream = async (target: SeedTarget): Promise<void> => {
  const url = `${target.kibanaUrl}${GET_NOTIFICATIONS_PATH}`;
  const response = await fetch(url, {
    headers: {
      ...HEADERS,
      ...basicAuth(target),
      'elastic-api-version': NOTIFICATION_CENTER_API_VERSION,
    },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
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
    throw new Error(`Failed to append notifications: ${reason ?? 'unknown error'}`);
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

/**
 * Trade the credentials for a session cookie. Read state is keyed by `profile_uid`, and only a
 * session carries one — a plain `Authorization: Basic` request has no read state at all.
 */
const login = async (target: SeedTarget): Promise<string> => {
  const { kibanaUrl, username, password } = target;
  const response = await fetch(`${kibanaUrl}/internal/security/login`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not log in to ${kibanaUrl} as "${username}": ${response.status}`);
  }
  // The cookie's name comes from `xpack.security.cookieName`, so send back whatever login set.
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ');
};

const userStorageRequest = async (
  kibanaUrl: string,
  cookie: string,
  key: string,
  init: RequestInit
): Promise<void> => {
  const url = `${kibanaUrl}/internal/user_storage/${encodeURIComponent(key)}`;
  const response = await fetch(url, { ...init, headers: { ...HEADERS, cookie } });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${await response.text()}`);
  }
};

/**
 * Backdate the seeded user's catch-up marker.
 *
 * Every fixture is backdated, and the marker is otherwise stamped at `now` the first time that
 * user opens the bell — always after seeding — so the whole chunk would arrive already read.
 */
export const setReadHorizon = async (target: SeedTarget, isoTimestamp: string): Promise<void> => {
  const cookie = await login(target);
  await userStorageRequest(target.kibanaUrl, cookie, READ_ALL_BEFORE_KEY, {
    method: 'PUT',
    body: JSON.stringify({ value: isoTimestamp }),
  });
};

/** Drop the marker and per-id overrides, so the next bell read stamps a fresh horizon. */
export const clearReadHorizon = async (target: SeedTarget): Promise<void> => {
  const cookie = await login(target);
  for (const key of [READ_ALL_BEFORE_KEY, OVERRIDES_KEY]) {
    await userStorageRequest(target.kibanaUrl, cookie, key, { method: 'DELETE' });
  }
};
