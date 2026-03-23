/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export const parseRepeatableFlag = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

export async function resolvePatterns(
  esClient: Client,
  log: ToolingLog,
  patterns: string[]
): Promise<string[]> {
  const resolved: string[] = [];

  for (const pattern of patterns) {
    if (!pattern.includes('*')) {
      resolved.push(pattern);
      continue;
    }

    try {
      const response = await esClient.indices.resolveIndex({
        name: pattern,
        expand_wildcards: 'all',
      });

      const indices = (response.indices ?? []).map((idx) => idx.name);
      if (indices.length === 0) {
        log.warning(`No indices matched pattern "${pattern}" — skipping`);
      } else {
        for (const idx of indices) {
          log.info(`Resolved ${pattern} → ${idx}`);
        }
        resolved.push(...indices);
      }
    } catch (err) {
      log.warning(
        `Failed to resolve pattern "${pattern}" — skipping: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return resolved;
}

export const validateIndexPrivileges = async (
  esClient: Client,
  log: ToolingLog,
  patterns: string[],
  onUnauthorized: (missing: string) => string
): Promise<void> => {
  // Superusers bypass index-level privilege checks at operation time, but
  // has_privileges returns false for restricted index wildcards even for
  // superusers. Check for the superuser role first and skip the index check.
  const authInfo = await esClient.security.authenticate();
  const roles: string[] = authInfo.roles ?? [];
  if (roles.includes('superuser')) {
    log.debug('Superuser detected — skipping index privilege check');
    return;
  }

  const privResult = await esClient.security.hasPrivileges({
    index: [{ names: patterns, privileges: ['manage'], allow_restricted_indices: true }],
  });

  if (!privResult.has_all_requested) {
    const missing = Object.entries(privResult.index ?? {})
      .filter(([, privs]) => !Object.values(privs as Record<string, boolean>).every(Boolean))
      .map(([idx]) => idx);
    throw new Error(onUnauthorized(missing.length > 0 ? missing.join(', ') : patterns.join(', ')));
  }

  log.debug('Index privilege check passed');
};

const ALIAS_SUFFIX_REGEX = /^(.+)-\d+$/;

const deriveAliasName = (indexName: string): string | undefined => {
  const match = indexName.match(ALIAS_SUFFIX_REGEX);
  return match ? match[1] : undefined;
};

export const createMissingAliases = async ({
  esClient,
  log,
  resolvedIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  resolvedIndices: string[];
}): Promise<void> => {
  let created = 0;
  let skipped = 0;

  for (const indexName of resolvedIndices) {
    const aliasName = deriveAliasName(indexName);
    if (!aliasName) {
      log.warning(
        `Index "${indexName}" does not match expected pattern (name-NNNNNN) — cannot derive alias name, skipping`
      );
      continue;
    }

    const aliasExists = await esClient.indices.existsAlias({ name: aliasName });
    if (aliasExists) {
      log.debug(`Alias "${aliasName}" already exists — skipping`);
      skipped++;
      continue;
    }

    log.info(`Creating alias "${aliasName}" → "${indexName}"`);
    await esClient.indices.updateAliases({
      actions: [
        {
          add: {
            index: indexName,
            alias: aliasName,
            is_write_index: true,
            is_hidden: true,
          },
        },
      ],
    });
    created++;
  }

  log.info(`Aliases complete: ${created} created, ${skipped} already existed`);
};
