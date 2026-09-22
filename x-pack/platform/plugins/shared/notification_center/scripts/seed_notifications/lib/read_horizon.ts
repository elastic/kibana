/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { READ_ALL_BEFORE_KEY } from '../../../server/storage/user_storage';
import type { SeedConnection } from './connection';

const SESSION_HEADERS = {
  'kbn-xsrf': 'seed-notifications',
  'x-elastic-internal-origin': 'kibana',
  'content-type': 'application/json',
};

const READ_HORIZON_PATH = `/internal/user_storage/${encodeURIComponent(READ_ALL_BEFORE_KEY)}`;

/**
 * Trade the Elasticsearch credentials for a Kibana session cookie.
 *
 * Read state is keyed by `profile_uid`, and only a session carries one — a plain `Authorization:
 * Basic` request resolves to a null userStorage client, which is why the seeded documents cannot
 * be annotated without logging in first.
 */
const login = async ({ kibanaUrl, username, password }: SeedConnection): Promise<string | null> => {
  const response = await fetch(`${kibanaUrl}/internal/security/login`, {
    method: 'POST',
    headers: SESSION_HEADERS,
    redirect: 'manual',
    body: JSON.stringify({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password },
    }),
  }).catch(() => undefined);

  if (!response?.ok) {
    return null;
  }
  // The session cookie's name comes from `xpack.security.cookieName`, so send back whatever
  // the login set rather than looking for one by name.
  const cookies = response.headers.getSetCookie().map((entry) => entry.split(';')[0]);
  return cookies.length > 0 ? cookies.join('; ') : null;
};

const request = async (
  connection: SeedConnection,
  init: RequestInit,
  log: ToolingLog
): Promise<boolean> => {
  const cookie = await login(connection);
  if (!cookie) {
    log.warning(
      `Could not log in to ${connection.kibanaUrl} as "${connection.username}", so the read ` +
        `horizon was left alone. Seeded notifications will show as read once you open the bell.`
    );
    return false;
  }

  const response = await fetch(`${connection.kibanaUrl}${READ_HORIZON_PATH}`, {
    ...init,
    headers: { ...SESSION_HEADERS, cookie },
  }).catch((error: unknown) => {
    log.warning(
      `Could not reach ${connection.kibanaUrl} to update the read horizon: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  });

  if (!response) {
    return false;
  }
  if (!response.ok) {
    log.warning(`Could not update the read horizon: ${response.status} ${await response.text()}`);
    return false;
  }
  return true;
};

/**
 * Backdate the catch-up marker for the user the script authenticated as.
 *
 * Every fixture is backdated, and the marker is otherwise stamped at `now` the first time that
 * user opens the bell — which is always after seeding — so without this the whole chunk arrives
 * already read. Writing the key also stops that first read from stamping over it.
 */
export const setReadHorizon = async (
  connection: SeedConnection,
  isoTimestamp: string,
  log: ToolingLog
): Promise<void> => {
  const updated = await request(
    connection,
    { method: 'PUT', body: JSON.stringify({ value: isoTimestamp }) },
    log
  );
  if (updated) {
    log.info(`Read horizon set to ${isoTimestamp} for "${connection.username}".`);
  }
};

/** Drop the catch-up marker, so the next read of the bell stamps a fresh one. */
export const clearReadHorizon = async (
  connection: SeedConnection,
  log: ToolingLog
): Promise<void> => {
  if (await request(connection, { method: 'DELETE' }, log)) {
    log.info(`Read horizon cleared for "${connection.username}".`);
  }
};
