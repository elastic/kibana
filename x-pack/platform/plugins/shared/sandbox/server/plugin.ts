/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SandboxPluginConfig } from './config';
import { SandboxApiClient } from './grpc_client';
import { SandboxSessionImpl } from './sandbox_session';
import type { SandboxSession } from './sandbox_session';

interface SandboxPluginStartDeps {
  spaces?: SpacesPluginStart;
}

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
 * // server/plugin.ts — typical usage inside a tool handler
 * start(_core, { sandbox }) {
 *   const getSandbox = () => sandbox;
 *   // inside a tool handler:
 *   try {
 *     const session = getSandbox()?.getSession(request, sessionId);
 *   } catch (err) {
 *     // sandbox plugin present but not configured in this deployment
 *   }
 * }
 * ```
 *
 * Note that `sandbox` itself is `undefined` when the plugin is not installed.
 * When it is installed but not configured (missing `api_key`/`ssl`, or
 * `xpack.sandbox.enabled: false`), `getSession` throws a descriptive error.
 */
export interface SandboxPluginStart {
  /**
   * Returns a {@link SandboxSession} for the given request + session ID.
   *
   * The space is derived automatically from the request. Sessions are created
   * lazily and cached for the lifetime of the plugin: the same
   * `(spaceId, sessionId)` pair always returns the same session object.
   * Pod allocation happens transparently on the first RPC.
   *
   * @throws {Error} When the sandbox is not configured in this deployment
   *   (`xpack.sandbox.enabled: false`, or missing `api_key`/`ssl`).
   */
  getSession(request: KibanaRequest, sessionId: string): SandboxSession;
}

export class SandboxPlugin implements Plugin<void, SandboxPluginStart, {}, SandboxPluginStartDeps> {
  private readonly logger: Logger;
  private apiClient?: SandboxApiClient;
  private readonly sessions = new Map<string, SandboxSession>();
  private spaces?: SpacesPluginStart;

  constructor(private readonly ctx: PluginInitializerContext<SandboxPluginConfig>) {
    this.logger = ctx.logger.get();
  }

  setup(_core: CoreSetup): void {}

  start(_core: CoreStart, { spaces }: SandboxPluginStartDeps): SandboxPluginStart {
    this.spaces = spaces;
    const pluginConfig = this.ctx.config.get();

    if (!pluginConfig.enabled || !pluginConfig.api_key || !pluginConfig.ssl) {
      if (pluginConfig.enabled) {
        this.logger.warn(
          'xpack.sandbox.enabled is true but api_key and ssl are not configured — sandbox is disabled'
        );
      }
      const reason = !pluginConfig.enabled
        ? 'xpack.sandbox.enabled is false'
        : 'xpack.sandbox.api_key and xpack.sandbox.ssl are required when enabled';
      return {
        getSession: () => {
          throw new Error(`Sandbox is not configured in this deployment: ${reason}`);
        },
      };
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
      getSession: (request, sessionId) => {
        const spaceId = this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        const key = `${spaceId}__${sessionId}`;
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
