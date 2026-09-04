/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SandboxApiClient } from './grpc_client';

// Sanitize a string to a valid env-var fragment: uppercase, runs of non-alphanumeric → _, trim _.
const sanitize = (s: string): string =>
  s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export async function seedSandbox({
  conversationId,
  apiClient,
  request,
  getActionsClient,
  logger,
}: {
  conversationId: string;
  apiClient: SandboxApiClient;
  request: KibanaRequest;
  getActionsClient: (req: KibanaRequest) => Promise<ActionsClient>;
  logger: Logger;
}): Promise<void> {
  const actionsClient = await getActionsClient(request);
  const connectors = await actionsClient.getAll({ includeSystemActions: false });

  if (connectors.length === 0) {
    logger.debug('No connectors found; skipping sandbox seeding');
    return;
  }

  // Fetch secrets for each connector in parallel; skip failures.
  const withSecrets = (
    await Promise.allSettled(
      connectors.map((c) => actionsClient.getWithSecrets({ id: c.id }))
    )
  ).flatMap((r, i) => {
    if (r.status === 'rejected') {
      logger.warn(`Skipping connector ${connectors[i].id} during seeding: ${r.reason}`);
      return [];
    }
    return [r.value];
  });

  // Build per-connector prefix, handling name collisions.
  const prefixCount = new Map<string, number>();
  for (const c of withSecrets) {
    const p = sanitize(c.name);
    prefixCount.set(p, (prefixCount.get(p) ?? 0) + 1);
  }

  const envLines: string[] = [];
  const mdLines: string[] = ['# Available Connectors', ''];

  for (const c of withSecrets) {
    const sanitizedName = sanitize(c.name);
    const prefix =
      prefixCount.get(sanitizedName)! > 1
        ? `CONNECTOR_${sanitizedName}_${c.id.slice(0, 6).toUpperCase()}`
        : `CONNECTOR_${sanitizedName}`;

    envLines.push(`# ${c.name}: ${c.name} (${c.actionTypeId})`);
    envLines.push(`export ${prefix}_ID=${shellQuote(c.id)}`);
    envLines.push(`export ${prefix}_TYPE=${shellQuote(c.actionTypeId)}`);

    const mdVarLines: string[] = [
      `- \`${prefix}_ID\` — connector ID`,
      `- \`${prefix}_TYPE\` — connector type (${c.actionTypeId})`,
    ];

    for (const [key, value] of Object.entries(c.config ?? {})) {
      const varName = `${prefix}_${sanitize(key)}`;
      envLines.push(`export ${varName}=${shellQuote(stringify(value))}`);
      mdVarLines.push(`- \`${varName}\` — ${key}`);
    }
    for (const [key, value] of Object.entries(c.secrets)) {
      const varName = `${prefix}_${sanitize(key)}`;
      envLines.push(`export ${varName}=${shellQuote(stringify(value))}`);
      mdVarLines.push(`- \`${varName}\` — ${key}`);
    }

    envLines.push('');

    mdLines.push(`## ${c.name} (\`${prefix}_*\`)`);
    mdLines.push(`- Type: \`${c.actionTypeId}\``);
    mdLines.push(...mdVarLines);
    mdLines.push('');
  }

  const envContent = envLines.join('\n');
  const mdContent = mdLines.join('\n');

  await apiClient.writeFiles(conversationId, [
    { path: '/workspace/.env', content: Buffer.from(envContent, 'utf8') },
    { path: '/workspace/connectors.md', content: Buffer.from(mdContent, 'utf8') },
  ]);

  logger.info(`Sandbox seeded with ${withSecrets.length} connector(s)`);
}

// Stringify a config/secret value: primitives as-is, objects/arrays as JSON.
const stringify = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Shell-quote a value: wrap in single quotes, escape embedded single quotes.
const shellQuote = (v: string): string => `'${v.replace(/'/g, "'\\''")}'`;
