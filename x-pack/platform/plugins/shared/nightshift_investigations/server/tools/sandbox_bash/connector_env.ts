/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A connector reduced to what the sandbox needs. Deliberately source-agnostic. */
export interface SeedConnector {
  id: string;
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface RenderedConnectorFiles {
  env: string;
  markdown: string;
}

// Sanitize a string to a valid env-var fragment: uppercase, runs of non-alphanumeric → _, trim _.
const sanitize = (s: string): string =>
  s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

// Stringify a config/secret value: primitives as-is, objects/arrays as JSON.
const stringify = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Shell-quote a value: wrap in single quotes, escape embedded single quotes.
const shellQuote = (v: string): string => `'${v.replace(/'/g, "'\\''")}'`;

/** Render connector metadata into sandbox seed files. Pure function — no side effects. */
export const renderConnectorFiles = (connectors: SeedConnector[]): RenderedConnectorFiles => {
  // Build per-connector prefix, handling name collisions.
  const prefixCount = new Map<string, number>();
  for (const c of connectors) {
    const p = sanitize(c.name);
    prefixCount.set(p, (prefixCount.get(p) ?? 0) + 1);
  }

  const envLines: string[] = [];
  const mdLines: string[] = ['# Available Connectors', ''];

  for (const c of connectors) {
    const sanitizedName = sanitize(c.name);
    const prefix =
      prefixCount.get(sanitizedName)! > 1
        ? `CONNECTOR_${sanitizedName}_${c.id.slice(0, 6).toUpperCase()}`
        : `CONNECTOR_${sanitizedName}`;

    envLines.push(`# ${c.id}: ${c.name} (${c.actionTypeId})`);
    envLines.push(`export ${prefix}_ID=${shellQuote(c.id)}`);
    envLines.push(`export ${prefix}_TYPE=${shellQuote(c.actionTypeId)}`);

    const mdVarLines: string[] = [
      `- \`${prefix}_ID\` — connector ID`,
      `- \`${prefix}_TYPE\` — connector type (${c.actionTypeId})`,
    ];

    for (const [key, value] of Object.entries(c.config)) {
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

  return {
    env: envLines.join('\n'),
    markdown: mdLines.join('\n'),
  };
};
