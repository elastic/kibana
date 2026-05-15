/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local-dev seeder. Imports the demo workflow YAMLs (one per input field
 * type from #16707, plus a multi-HITL chain and a short-timeout case)
 * into a running Kibana, then triggers a manual run for each so they
 * pause on `waitForInput` and surface in the Inbox.
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/inbox/scripts/demo/seed_inbox_demo.ts
 *
 * Flags:
 *   --respond            After seeding, auto-respond to a subset of the
 *                        pending rows so the inbox-history audit feed
 *                        has rows to render. Skips the short-timeout
 *                        workflow so its timeout fires and produces an
 *                        abnormal-settle row. Mixes approve/reject
 *                        payloads and tags responses with rotating
 *                        channels (`api`, `agent_builder`,
 *                        `kibana_execution_view`) so the per-channel
 *                        badges in the history feed all show up.
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

const ARGS = new Set(process.argv.slice(2));
const SHOULD_RESPOND = ARGS.has('--respond');

const WORKFLOWS_DIR = path.resolve(__dirname, 'workflows');
// Workflows whose runs should *not* be auto-responded to in
// `--respond` mode. Currently only the short-timeout case, which
// relies on the workflow timeout firing to populate an abnormal-settle
// history row. Match by file basename (no extension) for stability.
const SKIP_RESPOND_FILES = new Set(['08_short_timeout']);

const authHeader = (config: SeedConfig) =>
  `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;

const headers = (config: SeedConfig) => ({
  authorization: authHeader(config),
  'kbn-xsrf': 'inbox-seed',
  'content-type': 'application/json',
});

// The workflows management API is `access: 'public'` and versioned
// at `2023-10-31` (see workflows_management/.../route_constants.ts).
// Without the `elastic-api-version` header Kibana's versioned router
// returns 404 for public routes, which is what bites the seeder if
// it only sends auth + xsrf.
const workflowsHeaders = (config: SeedConfig) => ({
  ...headers(config),
  'elastic-api-version': '2023-10-31',
});

const inboxHeaders = (config: SeedConfig) => ({
  ...headers(config),
  // Internal API requires the elastic-api-version pin; aligned with
  // the inbox plugin's API_VERSIONS constant.
  'elastic-api-version': '1',
});

const spacePrefix = (config: SeedConfig) =>
  config.spaceId === 'default' ? '' : `/s/${config.spaceId}`;

const log = (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](`[seed-inbox-demo] ${message}`);
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface ImportedWorkflow {
  file: string;
  basename: string;
  workflowId: string;
}

const importWorkflow = async (
  config: SeedConfig,
  name: string,
  yaml: string
): Promise<{ id: string }> => {
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/workflows/workflow`;
  const response = await fetch(url, {
    method: 'POST',
    headers: workflowsHeaders(config),
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
    headers: workflowsHeaders(config),
    body: JSON.stringify({ inputs: {} }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to trigger workflow "${workflowId}" (HTTP ${response.status}): ${text}`
    );
  }
};

interface InboxAction {
  id: string;
  source_app: string;
  source_id: string;
  status: 'pending' | 'approved' | 'rejected';
  title: string;
  input_message?: string | null;
  input_schema?: {
    type?: string;
    properties?: Record<string, { type?: string; enum?: string[]; items?: { enum?: string[] } }>;
    required?: string[];
  } | null;
}

const listPendingActions = async (config: SeedConfig): Promise<InboxAction[]> => {
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/internal/inbox/actions?status=pending&per_page=100`;
  const response = await fetch(url, { headers: inboxHeaders(config) });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list pending inbox actions (HTTP ${response.status}): ${text}`);
  }
  const body = (await response.json()) as { actions: InboxAction[] };
  return body.actions ?? [];
};

const respondToAction = async (
  config: SeedConfig,
  action: InboxAction,
  input: Record<string, unknown>,
  channel: string
) => {
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/internal/inbox/actions/${encodeURIComponent(action.source_app)}/${encodeURIComponent(
    action.source_id
  )}/respond`;
  const response = await fetch(url, {
    method: 'POST',
    headers: inboxHeaders(config),
    body: JSON.stringify({ input, channel }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to respond to action ${action.source_id} (HTTP ${response.status}): ${text}`
    );
  }
};

/**
 * Builds an auto-response payload that satisfies the action's input
 * schema. Branches on the canonical demo shapes (`approved`,
 * `severity`, `reason`, …) so the resulting history rows exercise both
 * approve and reject paths of `deriveHistoryStatus` and the channel
 * badge variants. Returns `null` when the action's schema is shaped in
 * a way the seeder doesn't know how to auto-fill — the caller logs and
 * skips, leaving the row pending.
 */
const buildResponseInput = (
  action: InboxAction,
  index: number
): { input: Record<string, unknown>; intent: 'approve' | 'reject' } | null => {
  // Alternate approve/reject so history shows both badges.
  const intent: 'approve' | 'reject' = index % 3 === 0 ? 'reject' : 'approve';
  const props = action.input_schema?.properties ?? {};
  const payload: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(props)) {
    if (prop?.type === 'boolean') {
      payload[key] = intent === 'approve';
      continue;
    }
    if (prop?.enum && prop.enum.length > 0) {
      // Pick the first option for approve, last for reject so audit
      // payloads visibly differ in the JSON code-block.
      payload[key] = intent === 'approve' ? prop.enum[0] : prop.enum[prop.enum.length - 1];
      continue;
    }
    if (prop?.type === 'array') {
      const items = prop.items?.enum ?? [];
      payload[key] = items.slice(0, intent === 'approve' ? 2 : 1);
      continue;
    }
    if (prop?.type === 'number' || prop?.type === 'integer') {
      payload[key] = intent === 'approve' ? 42 : 13;
      continue;
    }
    if (prop?.type === 'string') {
      payload[key] =
        intent === 'approve'
          ? 'Approved by inbox demo seeder.'
          : 'Rejected by inbox demo seeder — synthetic test data.';
      continue;
    }
    // Unknown prop shape — bail so we don't ship garbage payloads.
    return null;
  }

  // Provide an explicit reject signal alongside the schema fields when
  // none of the schema's own props naturally encode rejection. This
  // exercises the `deriveHistoryStatus` heuristic's fallback paths
  // (`{ action: 'reject' }`) on string-only schemas.
  if (intent === 'reject' && payload.approved === undefined) {
    payload.action = 'reject';
  }

  return { input: payload, intent };
};

// Rotate channels across responses so the inbox-history feed renders
// every per-channel badge variant. `inbox` is the default for the
// in-product UI so we de-emphasize it and lead with the more
// distinctive ones the audit feed would otherwise rarely surface in a
// vanilla local-dev environment. The channel field is a free-form
// slug — `example-mcp-app-security` mirrors the public reference MCP
// app's identifier so its history rows look the same in this demo as
// they will in real customer setups.
const CHANNELS = [
  'example-mcp-app-security',
  'agent_builder',
  'kibana_execution_view',
  'slack',
] as const;

const respondToPendingActions = async (config: SeedConfig, imported: ImportedWorkflow[]) => {
  // Workflow execution (and the corresponding `WAITING_FOR_INPUT` step
  // doc) is queued via Task Manager, so a freshly-triggered run
  // doesn't appear in the inbox immediately. A short wait here is far
  // simpler than polling the listing endpoint.
  log('Waiting 3s for triggered runs to reach WAITING_FOR_INPUT…');
  await sleep(3000);

  const pending = await listPendingActions(config);
  if (pending.length === 0) {
    log('No pending inbox actions to respond to.', 'warn');
    return;
  }

  const skipWorkflowIds = new Set(
    imported.filter((w) => SKIP_RESPOND_FILES.has(w.basename)).map((w) => w.workflowId)
  );

  let responded = 0;
  let skipped = 0;
  for (let i = 0; i < pending.length; i++) {
    const action = pending[i];
    // `source_id` shape: `${workflowId}:${runId}:${stepExecId}`. Cheap
    // string check is enough — the inbox common type guarantees this
    // for the workflows provider (see `buildWorkflowSourceId`).
    const skipForTimeout = Array.from(skipWorkflowIds).some((wfId) =>
      action.source_id.startsWith(`${wfId}:`)
    );
    if (skipForTimeout) {
      log(`Skipping ${action.source_id} (reserved for timeout-driven abnormal settle)`);
      skipped++;
      continue;
    }

    const built = buildResponseInput(action, i);
    if (!built) {
      log(`Skipping ${action.source_id} — schema not auto-fillable`, 'warn');
      skipped++;
      continue;
    }

    const channel = CHANNELS[i % CHANNELS.length];
    try {
      await respondToAction(config, action, built.input, channel);
      log(`Responded ${built.intent} via ${channel}: ${action.source_id}`);
      responded++;
    } catch (err) {
      log(`Failed to respond to ${action.source_id}: ${String(err)}`, 'error');
    }
  }

  log(`Respond pass complete: ${responded} responded, ${skipped} skipped.`);
  if (skipWorkflowIds.size > 0) {
    log(
      `Wait ~45s for the short-timeout workflow to fire its timeout, then refresh the inbox to see the abnormal-settle history row.`
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

  const imported: ImportedWorkflow[] = [];
  for (const file of files) {
    const yaml = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf8');
    try {
      const { id } = await importWorkflow(CONFIG, file, yaml);
      log(`Imported ${file} -> workflow ${id}`);
      await triggerWorkflow(CONFIG, id);
      log(`Triggered run for workflow ${id}`);
      imported.push({ file, basename: path.basename(file, path.extname(file)), workflowId: id });
    } catch (err) {
      log(String(err), 'error');
    }
  }

  if (SHOULD_RESPOND && imported.length > 0) {
    try {
      await respondToPendingActions(CONFIG, imported);
    } catch (err) {
      log(`Auto-respond pass failed: ${String(err)}`, 'error');
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
