/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  ElasticsearchClient,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { DataStreamClient } from '@kbn/data-streams';
import type { AgentMemoryConfig } from './config';
import type {
  AgentMemoryPluginSetup,
  AgentMemoryPluginStart,
  AgentMemorySetupDependencies,
  AgentMemoryStartDependencies,
  GetMemoryStorage,
} from './types';
import { registerFeatures } from './features';
import { registerStatusRoute } from './routes/status';
import { registerSetupRoute } from './routes/setup';
import type { agentMemoryHistoryMappings } from './storage/history_stream';
import { createRecallTool } from './tools/recall';
import { createRememberTool } from './tools/remember';
import { createForgetTool } from './tools/forget';
import { memorySkill } from './skills/memory_skill';
import { registerMemoryHook } from './hooks/inject_memories';
import { registerMemoryWorkflowSteps } from './workflow_steps';

export class AgentMemoryPlugin
  implements
    Plugin<
      AgentMemoryPluginSetup,
      AgentMemoryPluginStart,
      AgentMemorySetupDependencies,
      AgentMemoryStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: AgentMemoryConfig;

  // All of these are set in start() before any request handler runs.
  /**
   * Factory for request-scoped storage. `agent-memory` is a user data index,
   * so each call must receive `asCurrentUser` — kibana_system cannot search it.
   */
  private createStorage?: GetMemoryStorage;
  private historyClient?: DataStreamClient<typeof agentMemoryHistoryMappings>;
  /** Plugin security: exposes authz for privilege checks in tools. */
  private securityStart?: SecurityPluginStart;
  /**
   * Core security: exposes authc for identity resolution. Only core's
   * `getCurrentUser` resolves the user behind a Task Manager fake request,
   * which is how the agent builder executes conversations.
   */
  private coreSecurity?: SecurityServiceStart;
  private elasticsearch?: CoreStart['elasticsearch'];
  private spacesStart?: SpacesPluginStart;

  constructor(context: PluginInitializerContext<AgentMemoryConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<AgentMemoryStartDependencies, AgentMemoryPluginStart>,
    setupDeps: AgentMemorySetupDependencies
  ): AgentMemoryPluginSetup {
    if (!this.config.enabled) {
      this.logger.debug('Agent Memory is disabled via config; skipping setup');
      return {};
    }

    registerFeatures({ features: setupDeps.features });

    const router = coreSetup.http.createRouter();

    // ── Lazy getters ──────────────────────────────────────────────────────────
    // All start-time services are exposed through getters so setup() registrations
    // can close over them without a circular reference. Each getter throws if called
    // before start() sets the backing field.

    const getMemoryStorage: GetMemoryStorage = (esClient) => {
      if (!this.createStorage)
        throw new Error('AgentMemoryPlugin: storage accessed before start()');
      return this.createStorage(esClient);
    };

    const getCurrentUserEsClient = (request: KibanaRequest): ElasticsearchClient => {
      if (!this.elasticsearch)
        throw new Error('AgentMemoryPlugin: elasticsearch accessed before start()');
      return this.elasticsearch.client.asScoped(request).asCurrentUser;
    };

    const getHistoryClient = (): DataStreamClient<typeof agentMemoryHistoryMappings> => {
      if (!this.historyClient)
        throw new Error('AgentMemoryPlugin: history client accessed before start()');
      return this.historyClient;
    };

    const getSecurityStart = (): SecurityPluginStart => {
      if (!this.securityStart)
        throw new Error('AgentMemoryPlugin: security accessed before start()');
      return this.securityStart;
    };

    const getCoreSecurity = (): SecurityServiceStart => {
      if (!this.coreSecurity)
        throw new Error('AgentMemoryPlugin: core security accessed before start()');
      return this.coreSecurity;
    };

    const getSpaceId = (request: KibanaRequest): string =>
      this.spacesStart?.spacesService.getSpaceId(request) ?? 'default';

    // ── Routes ────────────────────────────────────────────────────────────────
    registerStatusRoute({ router, getMemoryStorage });
    registerSetupRoute({ router, getMemoryStorage });

    // ── Tools ─────────────────────────────────────────────────────────────────
    const { tools, skills, hooks } = setupDeps.agentBuilder;

    tools.register(
      createRecallTool({ getStorage: getMemoryStorage, getSecurityStart, getCoreSecurity })
    );
    tools.register(
      createRememberTool({
        getStorage: getMemoryStorage,
        getHistoryClient,
        getSecurityStart,
        getCoreSecurity,
      })
    );
    tools.register(
      createForgetTool({
        getStorage: getMemoryStorage,
        getHistoryClient,
        getSecurityStart,
        getCoreSecurity,
      })
    );

    // ── Skill ─────────────────────────────────────────────────────────────────
    skills.register(memorySkill);

    // ── Auto-injection hook ───────────────────────────────────────────────────
    registerMemoryHook({
      hooksSetup: hooks,
      getStorage: getMemoryStorage,
      getCurrentUserEsClient,
      getSecurity: getSecurityStart,
      getCoreSecurity,
      getSpaceId,
      logger: this.logger.get('hook'),
    });

    // ── Workflow steps ────────────────────────────────────────────────────────
    registerMemoryWorkflowSteps(
      setupDeps.workflowsExtensions,
      getMemoryStorage,
      getHistoryClient,
      getSecurityStart,
      getCoreSecurity,
      getCurrentUserEsClient
    );

    return {};
  }

  async start(
    coreStart: CoreStart,
    startDeps: AgentMemoryStartDependencies
  ): Promise<AgentMemoryPluginStart> {
    if (!this.config.enabled) {
      return {};
    }

    const { createMemoryStorage } = await import('./storage/memory_storage');
    const { DataStreamClient } = await import('@kbn/data-streams');
    const { agentMemoryHistoryStream } = await import('./storage/history_stream');

    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;

    // Populate lazy-getter targets. These must be set before any request handler
    // could run — Kibana guarantees start() completes before the first request.
    this.securityStart = startDeps.security;
    this.coreSecurity = coreStart.security;
    this.elasticsearch = coreStart.elasticsearch;
    this.spacesStart = startDeps.spaces;

    // Belief-store factory — callers pass asCurrentUser. kibana_system has no
    // privileges on the non-dot `agent-memory` user-data index.
    this.createStorage = (esClient) =>
      createMemoryStorage({
        logger: this.logger.get('storage'),
        esClient,
      });

    // History client — a thin wrapper; create once and reuse across requests.
    this.historyClient = DataStreamClient.fromDefinition({
      dataStream: agentMemoryHistoryStream,
      elasticsearchClient: internalEsClient,
    });

    // Install the audit-trail data-stream template (idempotent, non-fatal).
    await DataStreamClient.initializeTemplate({
      dataStream: agentMemoryHistoryStream,
      elasticsearchClient: internalEsClient,
      logger: this.logger.get('history-stream'),
    }).catch((err: Error) => {
      this.logger.warn(`Failed to initialise agent memory history stream: ${err.message}`);
    });

    return {};
  }

  stop(): void {}
}
