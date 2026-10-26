/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { Notification } from '../../common/types';
import { NOTIFICATION_DATA_STREAM_NAME } from '../../server/storage/notification_data_stream';
import { OVERRIDES_KEY, READ_ALL_BEFORE_KEY } from '../../server/storage/user_storage';

export interface SeedTarget {
  esUrl: string;
  kibanaUrl: string;
  /**
   * Credentials for the direct Elasticsearch writes. Appending to and deleting from a system
   * data stream needs `allow_restricted_indices`, which `superuser` grants for reads only
   * (`ReservedRolesStore.SUPERUSER_ROLE_DESCRIPTOR`), so `elastic` cannot seed.
   */
  esAuth: { username: string; password: string };
  /** Credentials for Kibana. Read state is keyed by profile, so this is whoever opens the bell. */
  kibanaAuth: { username: string; password: string };
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export const createEsClient = ({ esUrl, esAuth }: SeedTarget): Client =>
  new Client({
    node: esUrl,
    auth: esAuth,
    // Elasticsearch serves a system data stream only to a caller whose product origin the
    // descriptor allows. Without this the bulk append and the cleanup delete are both refused.
    headers: { 'x-elastic-product-origin': 'kibana' },
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
    // Nothing has created the stream until a producer writes to it, and `--clean` still has to
    // reset the read horizon on a cluster that has never been seeded.
    ignore_unavailable: true,
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
  const {
    kibanaUrl,
    kibanaAuth: { username, password },
  } = target;
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
