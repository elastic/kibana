/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { SandboxPluginConfig } from './config';
import { SandboxApiClient } from './grpc_client';
import { SandboxSessionImpl } from './sandbox_session';
import type { SandboxSession } from './sandbox_session';

/**
 * Start contract for the Sandbox plugin.
 *
 * Obtain this from your plugin's `start` dependencies after declaring `sandbox`
 * as an optional plugin in `kibana.jsonc`:
 *
 * ```ts
 * // kibana.jsonc
 * { "plugin": { "optionalPlugins": ["sandbox"] } }
 *
 * // server/types.ts
 * import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
 * interface MyPluginStartDeps { sandbox?: SandboxPluginStart; }
 *
 * // server/plugin.ts
 * start(_core, { sandbox }) {
 *   const session = sandbox?.getSession(spaceId, conversationId);
 *   if (session) { /* sandbox is configured and ready *\/ }
 * }
 * ```
 *
 * `getSession` returns `undefined` when the sandbox is not configured
 * (`xpack.sandbox.enabled: false`, or missing `api_key`/`ssl`). Always guard
 * against `undefined` — the sandbox is an optional, deployment-specific service.
 */
export interface SandboxPluginStart {
  /**
   * Returns a {@link SandboxSession} for the given space + conversation, or
   * `undefined` when the sandbox is not configured in this deployment.
   *
   * Sessions are created lazily and cached for the lifetime of the plugin: the
   * same `(spaceId, conversationId)` pair always returns the same session
   * object. Pod allocation happens transparently on the first RPC.
   */
  getSession(spaceId: string, conversationId: string): SandboxSession | undefined;
}

export class SandboxPlugin implements Plugin<void, SandboxPluginStart> {
  private readonly logger: Logger;
  private apiClient?: SandboxApiClient;
  private readonly sessions = new Map<string, SandboxSession>();

  constructor(private readonly ctx: PluginInitializerContext<SandboxPluginConfig>) {
    this.logger = ctx.logger.get();
  }

  setup(_core: CoreSetup): void {}

  start(_core: CoreStart): SandboxPluginStart {
    const pluginConfig = this.ctx.config.get();

    if (!pluginConfig.enabled || !pluginConfig.api_key || !pluginConfig.ssl) {
      if (pluginConfig.enabled) {
        this.logger.warn(
          'xpack.sandbox.enabled is true but api_key and ssl are not configured — sandbox is disabled'
        );
      }
      return { getSession: () => undefined };
    }

    const { host, port, api_key: apiKey, ssl } = pluginConfig;

    this.apiClient = new SandboxApiClient({
      host,
      port,
      apiKey,
      rootCertPem: ssl.certificate_authorities
        ? Buffer.from(ssl.certificate_authorities)
        : undefined,
      clientCertPem: Buffer.from(ssl.certificate),
      clientKeyPem: Buffer.from(ssl.key),
    });

    const apiClient = this.apiClient;
    const sessions = this.sessions;
    const logger = this.logger;

    return {
      getSession: (spaceId, conversationId) => {
        const key = `${spaceId}:${conversationId}`;
        let session = sessions.get(key);
        if (!session) {
          session = new SandboxSessionImpl(key, apiClient, logger.get('session'));
          sessions.set(key, session);
        }
        return session;
      },
    };
  }

  stop(): void {
    this.apiClient?.close();
    this.sessions.clear();
  }
}
