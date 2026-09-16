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

export interface SandboxPluginStart {
  /** Returns undefined when the sandbox is not configured (xpack.sandbox.enabled is false). */
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
