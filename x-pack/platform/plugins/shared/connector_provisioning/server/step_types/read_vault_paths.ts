/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';

interface VaultReadSecretResult {
  status: string;
  data?: { value?: string; values?: Record<string, string> };
}

/**
 * Reads every unique Vault path once via the given Vault connector's `readSecret`
 * action, caching by path (Handler step 3, \u00a75.3). Always requests the whole secret
 * (no `field` filter) so both auto-match and explicit-override bindings against the
 * same path only need a single Vault round trip.
 *
 * On failure -- whether `execute()` rejects, or resolves with a non-`'ok'` status --
 * throws a name-only error built solely from the path and the (caller-supplied,
 * already-validated) target connector name. It never forwards the underlying error's
 * text, even though `.hashicorp_vault`'s own error-construction discipline already
 * makes that text value-free (guarantee 4a): this stays defensively name-only
 * regardless of that upstream guarantee, and regardless of whether the failure came
 * from the connector handler itself or from surrounding actions-plugin machinery
 * (authorization, connector lookup, etc.).
 */
export async function readVaultPaths({
  actionsClient,
  vaultConnectorId,
  paths,
  allowSensitiveOutput,
  targetConnectorName,
}: {
  actionsClient: ActionsClient;
  vaultConnectorId: string;
  paths: string[];
  allowSensitiveOutput: symbol;
  targetConnectorName: string;
}): Promise<Map<string, Record<string, string>>> {
  const valuesByPath = new Map<string, Record<string, string>>();

  const fail = (path: string): never => {
    throw new Error(
      `Failed to read the Vault secret at path '${path}' while provisioning connector ` +
        `'${targetConnectorName}'. Check the path, the Vault connector's credentials, and ` +
        `that the mount is a KV v2 secrets engine.`
    );
  };

  for (const path of paths) {
    let result: VaultReadSecretResult;
    try {
      result = (await actionsClient.execute({
        actionId: vaultConnectorId,
        params: { subAction: 'readSecret', subActionParams: { path } },
        allowSensitiveOutput,
      })) as VaultReadSecretResult;
    } catch {
      return fail(path);
    }

    if (result.status !== 'ok') {
      return fail(path);
    }

    valuesByPath.set(path, result.data?.values ?? {});
  }

  return valuesByPath;
}
