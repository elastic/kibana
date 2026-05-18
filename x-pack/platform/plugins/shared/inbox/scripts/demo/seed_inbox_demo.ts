/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local-dev seeder. Imports the demo workflow YAMLs (one per input field
 * type from #16707) into a running Kibana, then triggers a manual run for
 * each so they pause on `waitForInput` and surface in the Inbox.
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts
 *
 * Env overrides (defaults match `yarn start --no-base-path`):
 *   KIBANA_URL=http://localhost:5601
 *   KIBANA_USERNAME=elastic
 *   KIBANA_PASSWORD=changeme
 *
 * Pre-reqs: Workflows + Inbox enabled in `kibana.dev.yml`:
 *   xpack.inbox.enabled: true
 *
 * The script is intentionally dependency-light — no SDK, just `fetch`.
 */

import { promises as fs } from 'fs';
import path from 'path';

interface SeedConfig {
  kibanaUrl: string;
  username: string;
  password: string;
  spaceId: string;
}

const CONFIG: SeedConfig = {
  kibanaUrl: process.env.KIBANA_URL ?? 'http://localhost:5601',
  username: process.env.KIBANA_USERNAME ?? 'elastic',
  password: process.env.KIBANA_PASSWORD ?? 'changeme',
  spaceId: process.env.KIBANA_SPACE_ID ?? 'default',
};

const WORKFLOWS_DIR = path.resolve(__dirname, 'workflows');

const authHeader = (config: SeedConfig) =>
  `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;

const headers = (config: SeedConfig) => ({
  authorization: authHeader(config),
  'kbn-xsrf': 'inbox-seed',
  'content-type': 'application/json',
});

const spacePrefix = (config: SeedConfig) =>
  config.spaceId === 'default' ? '' : `/s/${config.spaceId}`;

const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[seed-inbox-demo] ${message}`);
};

const importWorkflow = async (config: SeedConfig, name: string, yaml: string) => {
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/workflows/workflow`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ yaml }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to import workflow "${name}" (HTTP ${response.status}): ${text}`);
  }
  return (await response.json()) as { id: string };
};

const triggerWorkflow = async (config: SeedConfig, workflowId: string) => {
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/workflows/workflow/${workflowId}/run`;
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ inputs: {} }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to trigger workflow "${workflowId}" (HTTP ${response.status}): ${text}`
    );
  }
};

const seed = async () => {
  log(`Reading demo workflows from ${WORKFLOWS_DIR}`);
  const files = (await fs.readdir(WORKFLOWS_DIR)).filter((file) => file.endsWith('.yml')).sort();

  if (files.length === 0) {
    log('No workflow YAMLs found, nothing to seed', 'warn');
    return;
  }

  for (const file of files) {
    const yaml = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf8');
    try {
      const { id } = await importWorkflow(CONFIG, file, yaml);
      log(`Imported ${file} -> workflow ${id}`);
      await triggerWorkflow(CONFIG, id);
      log(`Triggered run for workflow ${id}`);
    } catch (err) {
      log(String(err), 'error');
    }
  }

  log(
    `Done. Open ${CONFIG.kibanaUrl}${spacePrefix(CONFIG)}/app/inbox to see the seeded inbox items.`
  );
};

seed().catch((err) => {
  log(String(err), 'error');
  process.exitCode = 1;
});
