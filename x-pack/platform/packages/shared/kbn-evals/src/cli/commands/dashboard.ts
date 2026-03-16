/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { generateNdjson, getAllManagedIds, SAVED_OBJECT_IDS } from '../../dashboard/saved_objects';

const DEFAULT_KBN_URL = 'http://elastic:changeme@localhost:5620';

const resolveKibanaUrl = (): string =>
  process.env.EVALUATIONS_KBN_URL ?? process.env.KIBANA_URL ?? DEFAULT_KBN_URL;

const createAuthHeaders = (url: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'kbn-xsrf': 'true',
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
    parsed.username = '';
    parsed.password = '';
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
  Create or update Kibana Lens dashboard for evaluation scores.

  Examples:
    node scripts/evals dashboard                     # Create/update dashboard
    node scripts/evals dashboard --delete             # Remove all managed objects
    node scripts/evals dashboard --kibana-url http://localhost:5601
  `,
  flags: {
    boolean: ['delete'],
    string: ['kibana-url'],
    default: { delete: false },
  },
  run: async ({ log, flagsReader }) => {
    const isDelete = flagsReader.boolean('delete');
    const kbnUrlRaw = flagsReader.string('kibana-url') ?? resolveKibanaUrl();
    const baseUrl = stripCredentials(kbnUrlRaw);
    const headers = createAuthHeaders(kbnUrlRaw);

    if (isDelete) {
      await deleteSavedObjects({ baseUrl, headers, log });
    } else {
      await importSavedObjects({ baseUrl, headers, log });
    }
  },
};

const importSavedObjects = async ({
  baseUrl,
  headers,
  log,
}: {
  baseUrl: string;
  headers: Record<string, string>;
  log: ToolingLog;
}): Promise<void> => {
  const ndjson = generateNdjson();
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
  const formData = new FormData();
  formData.append('file', blob, 'evals-dashboard.ndjson');

  const url = `${baseUrl}/api/saved_objects/_import?overwrite=true`;
  log.info(`Importing saved objects to ${baseUrl}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to import saved objects: ${response.status} ${response.statusText}\n${body}`
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    successCount?: number;
    errors?: Array<{ id: string; type: string; error: { type: string; message?: string } }>;
  };

  if (!result.success) {
    const errorMessages = (result.errors ?? [])
      .map((e) => `  ${e.type}/${e.id}: ${e.error.type} - ${e.error.message ?? 'unknown'}`)
      .join('\n');
    throw new Error(`Import reported errors:\n${errorMessages}`);
  }

  log.info(`Successfully imported ${result.successCount ?? 0} saved objects.`);
  log.info(`Dashboard: ${baseUrl}/app/dashboards#/view/${SAVED_OBJECT_IDS.dashboard}`);
};

const deleteSavedObjects = async ({
  baseUrl,
  headers,
  log,
}: {
  baseUrl: string;
  headers: Record<string, string>;
  log: ToolingLog;
}): Promise<void> => {
  const managedIds = getAllManagedIds();
  log.info(`Deleting ${managedIds.length} managed saved objects from ${baseUrl}...`);

  let deletedCount = 0;
  let notFoundCount = 0;

  for (const { type, id } of managedIds) {
    const url = `${baseUrl}/api/saved_objects/${encodeURIComponent(type)}/${encodeURIComponent(
      id
    )}`;
    const response = await fetch(url, { method: 'DELETE', headers });

    if (response.ok) {
      deletedCount++;
    } else if (response.status === 404) {
      notFoundCount++;
    } else {
      const body = await response.text();
      log.error(
        `Failed to delete ${type}/${id}: ${response.status} ${response.statusText} — ${body}`
      );
    }
  }

  log.info(`Deleted ${deletedCount} objects (${notFoundCount} already absent).`);
};
