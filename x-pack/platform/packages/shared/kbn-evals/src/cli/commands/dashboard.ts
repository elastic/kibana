/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  generateDashboardBody,
  generateDataViewBody,
  DASHBOARD_ID,
  DATA_VIEW_ID,
} from '../../dashboard/saved_objects';

const DEFAULT_KBN_URL = 'http://elastic:changeme@localhost:5620';

const resolveKibanaUrl = (): string =>
  process.env.EVALUATIONS_KBN_URL ?? process.env.KIBANA_URL ?? DEFAULT_KBN_URL;

const createAuthHeaders = (url: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json',
    'X-Elastic-Internal-Origin': 'Kibana',
  };

  const apiKey = process.env.EVALUATIONS_KBN_API_KEY;
  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
    return headers;
  }

  const parsed = new URL(url);
  if (parsed.username) {
    const credentials = Buffer.from(`${parsed.username}:${parsed.password}`).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
  }

  return headers;
};

const stripCredentials = (url: string): string => {
  const parsed = new URL(url);
  parsed.username = '';
  parsed.password = '';
  return parsed.toString().replace(/\/$/, '');
};

export const dashboardCmd: Command<void> = {
  name: 'dashboard',
  description: `
  Create or update Kibana Lens dashboard for evaluation scores using the Dashboard REST API.

  Examples:
    node scripts/evals dashboard                     # Create/update dashboard
    node scripts/evals dashboard --delete             # Remove dashboard and data view
    node scripts/evals dashboard --kibana-url http://localhost:5601
    node scripts/evals dashboard --dry-run            # Print request bodies without sending
  `,
  flags: {
    boolean: ['delete', 'dry-run'],
    string: ['kibana-url'],
    default: { delete: false, 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const isDelete = flagsReader.boolean('delete');
    const isDryRun = flagsReader.boolean('dry-run');
    const kbnUrlRaw = flagsReader.string('kibana-url') ?? resolveKibanaUrl();

    let baseUrl: string;
    let headers: Record<string, string>;
    try {
      baseUrl = stripCredentials(kbnUrlRaw);
      headers = createAuthHeaders(kbnUrlRaw);
    } catch (_e) {
      log.error(
        `Invalid Kibana URL: "${kbnUrlRaw}". Provide a valid URL via --kibana-url or KIBANA_URL env var.`
      );
      process.exitCode = 1;
      return;
    }

    if (isDryRun) {
      await dryRun({ log });
      return;
    }

    if (isDelete) {
      await deleteDashboard({ baseUrl, headers, log });
    } else {
      await createOrUpdateDashboard({ baseUrl, headers, log });
    }
  },
};

const dryRun = async ({ log }: { log: ToolingLog }): Promise<void> => {
  const dataViewBody = generateDataViewBody();
  const dashboardBody = generateDashboardBody();

  log.info('=== Data View (POST /api/data_views/data_view) ===');
  log.info(JSON.stringify(dataViewBody, null, 2));
  log.info('');
  log.info(`=== Dashboard (POST /internal/dashboards/app/${DASHBOARD_ID}) ===`);
  log.info(JSON.stringify(dashboardBody, null, 2));
  log.info('');
  log.info(`Total panels: ${dashboardBody.panels.length}`);
  log.info(`Dashboard ID: ${DASHBOARD_ID}`);
  log.info(`Data View ID: ${DATA_VIEW_ID}`);
};

const FETCH_TIMEOUT_MS = 30_000;

const createOrUpdateDashboard = async ({
  baseUrl,
  headers,
  log,
}: {
  baseUrl: string;
  headers: Record<string, string>;
  log: ToolingLog;
}): Promise<void> => {
  const dataViewBody = generateDataViewBody();
  log.info(`Creating data view "${dataViewBody.data_view.name}"...`);

  const dvResponse = await fetch(`${baseUrl}/api/data_views/data_view`, {
    method: 'POST',
    headers,
    body: JSON.stringify(dataViewBody),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (dvResponse.ok) {
    log.info('Data view created.');
  } else if (dvResponse.status === 409) {
    log.info('Data view already exists, skipping.');
  } else {
    const body = await dvResponse.text();
    log.warning(`Data view creation returned ${dvResponse.status}: ${body}`);
  }

  const dashboardBody = generateDashboardBody();
  const dashboardUrl = `${baseUrl}/internal/dashboards/app/${DASHBOARD_ID}?apiVersion=1`;

  log.info(`Creating dashboard "${dashboardBody.title}" via Dashboard API...`);

  let response = await fetch(dashboardUrl, {
    method: 'POST',
    headers: { ...headers, 'elastic-api-version': '1' },
    body: JSON.stringify(dashboardBody),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (response.status === 409) {
    log.info('Dashboard already exists, updating...');
    response = await fetch(dashboardUrl, {
      method: 'PUT',
      headers: { ...headers, 'elastic-api-version': '1' },
      body: JSON.stringify(dashboardBody),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to create/update dashboard: ${response.status} ${response.statusText}\n${body}`
    );
  }

  const result = (await response.json()) as { id: string };
  log.info(`Dashboard created/updated: ${result.id}`);
  log.info(`View at: ${baseUrl}/app/dashboards#/view/${result.id}`);
};

const deleteDashboard = async ({
  baseUrl,
  headers,
  log,
}: {
  baseUrl: string;
  headers: Record<string, string>;
  log: ToolingLog;
}): Promise<void> => {
  log.info(`Deleting dashboard ${DASHBOARD_ID}...`);

  const dashResponse = await fetch(
    `${baseUrl}/internal/dashboards/app/${DASHBOARD_ID}?apiVersion=1`,
    {
      method: 'DELETE',
      headers: { ...headers, 'elastic-api-version': '1' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );

  if (dashResponse.ok) {
    log.info('Dashboard deleted.');
  } else if (dashResponse.status === 404) {
    log.info('Dashboard not found, already deleted.');
  } else {
    const body = await dashResponse.text();
    log.warning(`Dashboard delete returned ${dashResponse.status}: ${body}`);
  }

  log.info(`Deleting data view ${DATA_VIEW_ID}...`);

  const dvResponse = await fetch(`${baseUrl}/api/data_views/data_view/${DATA_VIEW_ID}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (dvResponse.ok) {
    log.info('Data view deleted.');
  } else if (dvResponse.status === 404) {
    log.info('Data view not found, already deleted.');
  } else {
    const body = await dvResponse.text();
    log.warning(`Data view delete returned ${dvResponse.status}: ${body}`);
  }
};
