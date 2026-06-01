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

/** Find all workflow IDs whose name exactly matches `name`. */
const findWorkflowIdsByName = async (config: SeedConfig, name: string): Promise<string[]> => {
  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/workflows?query=${encodeURIComponent(
    name
  )}&size=100`;
  const response = await fetch(url, { headers: headers(config), method: 'GET' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to list workflows (HTTP ${response.status}): ${text}`);
  }
  const body = (await response.json()) as { results?: Array<{ id: string; name: string }> };
  return (body.results ?? []).filter((w) => w.name === name).map((w) => w.id);
};

/** Delete a workflow by ID. Ignores 404. */
const deleteWorkflow = async (config: SeedConfig, workflowId: string): Promise<void> => {
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/api/workflows/workflow/${encodeURIComponent(workflowId)}`;
  const response = await fetch(url, { headers: headers(config), method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Failed to delete workflow "${workflowId}" (HTTP ${response.status}): ${text}`);
  }
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

/** Extract the `name:` field from a workflow YAML string. */
const extractWorkflowName = (yaml: string): string | undefined =>
  yaml.match(/^name:\s*(.+)$/m)?.[1]?.trim();

/** Delete an Agent Builder tool if it exists. Ignores 404. */
const deleteWorkflowTool = async (config: SeedConfig, toolId: string): Promise<void> => {
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/api/agent_builder/tools/${encodeURIComponent(toolId)}?force=true`;
  const response = await fetch(url, { headers: headers(config), method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Failed to delete tool "${toolId}" (HTTP ${response.status}): ${text}`);
  }
};

/**
 * Delete any existing Agent Builder tool with this ID, then recreate it
 * pointing at the given workflow. This ensures the tool always references
 * the latest imported workflow.
 */
const createWorkflowTool = async (
  config: SeedConfig,
  toolId: string,
  workflowId: string
): Promise<void> => {
  await deleteWorkflowTool(config, toolId);

  const url = `${config.kibanaUrl}${spacePrefix(config)}/api/agent_builder/tools`;
  const response = await fetch(url, {
    body: JSON.stringify({
      configuration: { wait_for_completion: true, workflow_id: workflowId },
      description: `Triggers the '${toolId}' workflow`,
      id: toolId,
      type: 'workflow',
    }),
    headers: headers(config),
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create tool "${toolId}" (HTTP ${response.status}): ${text}`);
  }
  log(`Created tool "${toolId}" -> workflow ${workflowId}`);
};

const DEFAULT_AGENT_ID = 'elastic-ai-agent';

interface AgentDefinition {
  configuration?: {
    tools?: Array<{ tool_ids?: string[] }>;
  };
}

/** Read the current tool IDs on an agent. Returns null if the agent doesn't exist. */
const getAgentToolIds = async (config: SeedConfig, agentId: string): Promise<string[] | null> => {
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/api/agent_builder/agents/${encodeURIComponent(agentId)}`;
  const response = await fetch(url, { headers: headers(config), method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get agent "${agentId}" (HTTP ${response.status}): ${text}`);
  }
  const body = (await response.json()) as AgentDefinition;
  return (body.configuration?.tools ?? []).flatMap((t) => t.tool_ids ?? []);
};

/**
 * Merge seed tool IDs onto an agent's tool list, preserving any tools the
 * user added manually. Since deleting a tool with force=true removes it from
 * agents, this must run after every createWorkflowTool call.
 */
const mergeSeedToolsOntoAgent = async (
  config: SeedConfig,
  agentId: string,
  seedToolIds: string[]
): Promise<void> => {
  const existingToolIds = await getAgentToolIds(config, agentId);
  if (existingToolIds === null) {
    log(`Agent "${agentId}" not found — skipping tool association`, 'warn');
    return;
  }

  // Compute which seed tools are missing from the agent's current list.
  // Any tool the user added manually must be preserved — we only append, never replace.
  const existingSet = new Set(existingToolIds);
  const toAdd = seedToolIds.filter((id) => !existingSet.has(id));
  if (toAdd.length === 0) {
    log(`Agent "${agentId}" already has all seed tools`);
    return;
  }

  // PUT replaces the entire tool list, so we must send the full merged set.
  // Prepend existing IDs so manually-added tools keep their original order.
  const mergedIds = [...existingToolIds, ...toAdd];
  const url = `${config.kibanaUrl}${spacePrefix(
    config
  )}/api/agent_builder/agents/${encodeURIComponent(agentId)}`;
  const response = await fetch(url, {
    body: JSON.stringify({ configuration: { tools: [{ tool_ids: mergedIds }] } }),
    headers: headers(config),
    method: 'PUT',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update agent "${agentId}" tools (HTTP ${response.status}): ${text}`);
  }
  log(`Associated ${toAdd.length} tool(s) with agent "${agentId}": ${toAdd.join(', ')}`);
};

const seed = async () => {
  log(`Reading demo workflows from ${WORKFLOWS_DIR}`);
  const files = (await fs.readdir(WORKFLOWS_DIR)).filter((file) => file.endsWith('.yml')).sort();

  if (files.length === 0) {
    log('No workflow YAMLs found, nothing to seed', 'warn');
    return;
  }

  const seededToolIds: string[] = [];

  for (const file of files) {
    const yaml = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf8');
    try {
      const workflowName = extractWorkflowName(yaml);
      if (workflowName) {
        const existingIds = await findWorkflowIdsByName(CONFIG, workflowName);
        for (const existingId of existingIds) {
          await deleteWorkflow(CONFIG, existingId);
          log(`Deleted existing workflow ${existingId} ("${workflowName}")`);
        }
      }

      const { id } = await importWorkflow(CONFIG, file, yaml);
      log(`Imported ${file} -> workflow ${id}`);

      const toolId = workflowName;
      if (toolId) {
        await createWorkflowTool(CONFIG, toolId, id);
        seededToolIds.push(toolId);
      }

      await triggerWorkflow(CONFIG, id);
      log(`Triggered run for workflow ${id}`);
    } catch (err) {
      log(String(err), 'error');
    }
  }

  if (seededToolIds.length > 0) {
    try {
      await mergeSeedToolsOntoAgent(CONFIG, DEFAULT_AGENT_ID, seededToolIds);
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
