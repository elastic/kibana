/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import { SandboxProfileClient } from './profile_client';
import { SANDBOX_PROFILE_SO_TYPE, type SandboxProfileAttributes } from './saved_object';

/**
 * Module holder for building request-scoped SandboxProfileClients.
 *
 * Mirrors the opencode executor's holder pattern: threading a full service
 * through the runner/tool/route context is invasive, so this experimental
 * capability exposes a small factory initialized at plugin start.
 */
interface Deps {
  core: CoreStart;
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  canEncrypt: boolean;
  logger: Logger;
}

let deps: Deps | undefined;

export const initSandboxProfileProvider = (d: Deps): void => {
  deps = d;
};

export const canEncryptSandboxProfiles = (): boolean => deps?.canEncrypt ?? false;

/** Request-scoped client (respects the caller's RBAC + space). */
export const getSandboxProfileClient = (request: KibanaRequest): SandboxProfileClient => {
  if (!deps) {
    throw new Error('Sandbox profile provider not initialized');
  }
  const soClient = deps.core.savedObjects.getScopedClient(request, {
    includedHiddenTypes: [SANDBOX_PROFILE_SO_TYPE],
  });
  return new SandboxProfileClient(
    soClient,
    deps.encryptedSavedObjects.getClient({ includedHiddenTypes: [SANDBOX_PROFILE_SO_TYPE] }),
    deps.logger
  );
};

/**
 * Internal-user resolution of a profile WITH its decrypted secrets, used by the
 * executor (which runs outside a request context) to build a provider
 * connection. Secrets are consumed internally and never returned to the browser.
 */
export const resolveProfileWithSecrets = async (
  id: string,
  { namespace }: { namespace?: string } = {}
): Promise<(SandboxProfile & { secrets: Record<string, string> }) | undefined> => {
  if (!deps) {
    throw new Error('Sandbox profile provider not initialized');
  }
  const encryptedClient = deps.encryptedSavedObjects.getClient({
    includedHiddenTypes: [SANDBOX_PROFILE_SO_TYPE],
  });
  try {
    const so = await encryptedClient.getDecryptedAsInternalUser<SandboxProfileAttributes>(
      SANDBOX_PROFILE_SO_TYPE,
      id,
      { namespace }
    );
    const attrs = so.attributes;
    return {
      id: so.id,
      name: attrs.name,
      description: attrs.description,
      provider: attrs.provider,
      runtime: attrs.runtime,
      connection: attrs.connection,
      runtimeConfig: attrs.runtime_config,
      policy: attrs.policy,
      createdAt: attrs.created_at,
      updatedAt: attrs.updated_at,
      secrets: attrs.secrets ?? {},
    };
  } catch (err) {
    if ((err as { output?: { statusCode?: number } })?.output?.statusCode === 404) return undefined;
    deps.logger.warn(`Failed to resolve sandbox profile ${id}: ${(err as Error).message}`);
    throw err;
  }
};
