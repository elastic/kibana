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
import { readTlsCredentials } from './tls_credentials';
import type { SandboxTlsCredentials } from './tls_credentials';

interface SandboxPluginStartDeps {
  spaces?: SpacesPluginStart;
}

/**
 * Setup contract for the Sandbox plugin.
 *
 * Available in your plugin's `setup` deps when `sandbox` is declared as an
 * optional plugin. Use `isAvailable` to gate registration of sandbox-dependent
 * features so they are absent (rather than present-but-erroring) in deployments
 * where the sandbox is not configured.
 */
export interface SandboxPluginSetup {
  /** `true` when `xpack.sandbox.enabled` is `true` and `api_key` is present in config. */
  readonly isAvailable: boolean;
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
 * When it is installed but not configured (missing `api_key`, or
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
   *   (`xpack.sandbox.enabled: false`, or missing `api_key`).
   */
  getSession(request: KibanaRequest, sessionId: string): SandboxSession;

  /**
   * Returns a {@link SandboxSession} for an explicit space ID + session ID.
   *
   * Use this when no `KibanaRequest` is available (e.g. workflow step handlers).
   * Sessions are cached by `(spaceId, sessionId)` exactly like {@link getSession}.
   *
   * @throws {Error} When the sandbox is not configured in this deployment.
   */
  getSessionForSpace(spaceId: string, sessionId: string): SandboxSession;
}

export class SandboxPlugin
  implements Plugin<SandboxPluginSetup, SandboxPluginStart, {}, SandboxPluginStartDeps>
{
  private readonly logger: Logger;
  private apiClient?: SandboxApiClient;
  private readonly sessions = new Map<string, SandboxSession>();
  private spaces?: SpacesPluginStart;
  private tlsCredentials?: SandboxTlsCredentials;

  constructor(private readonly ctx: PluginInitializerContext<SandboxPluginConfig>) {
    this.logger = ctx.logger.get();
  }

  setup(_core: CoreSetup): SandboxPluginSetup {
    const config = this.ctx.config.get();
    if (config.enabled) {
      this.tlsCredentials = readTlsCredentials(config.ssl);
    }
    return {
      isAvailable: config.enabled && !!config.api_key,
    };
  }

  start(_core: CoreStart, { spaces }: SandboxPluginStartDeps): SandboxPluginStart {
    this.spaces = spaces;
    const pluginConfig = this.ctx.config.get();
    const { tlsCredentials } = this;

    if (!pluginConfig.enabled || !pluginConfig.api_key || !tlsCredentials) {
      if (pluginConfig.enabled) {
        this.logger.warn(
          'xpack.sandbox.enabled is true but api_key is not configured — sandbox is disabled'
        );
      }
      const reason = !pluginConfig.enabled
        ? 'xpack.sandbox.enabled is false'
        : 'xpack.sandbox.api_key is required when enabled';
      const throwNotConfigured = (): never => {
        throw new Error(`Sandbox is not configured in this deployment: ${reason}`);
      };
      return {
        getSession: throwNotConfigured,
        getSessionForSpace: throwNotConfigured,
      };
    }

    const { host, port, api_key: apiKey } = pluginConfig;

    this.apiClient = new SandboxApiClient({ host, port, apiKey, ...tlsCredentials });

    const apiClient = this.apiClient;
    const sessions = this.sessions;
    const logger = this.logger;

    const getOrCreateSession = (spaceId: string, sessionId: string): SandboxSession => {
      // `:` is not a legal space-ID character so this cache key is unambiguous.
      const cacheKey = `${spaceId}:${sessionId}`;
      // `__` stays within [a-zA-Z0-9_.-]: the sandbox service passes this value as the
      // Docker container name and rejects anything outside that character set.
      const conversationId = `${spaceId}__${sessionId}`;
      let session = sessions.get(cacheKey);
      if (!session) {
        session = new SandboxSessionImpl(conversationId, apiClient, logger.get('session'));
        sessions.set(cacheKey, session);
      }
      return session;
    };

    return {
      getSession: (request, sessionId) => {
        const spaceId = this.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        return getOrCreateSession(spaceId, sessionId);
      },
      getSessionForSpace: (spaceId, sessionId) => getOrCreateSession(spaceId, sessionId),
    };
  }

  stop(): void {
    this.apiClient?.close();
    this.sessions.clear();
  }
}
