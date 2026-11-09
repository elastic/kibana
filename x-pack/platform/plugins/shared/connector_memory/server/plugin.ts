/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import { ContextEngineConnectorFeatureId } from '@kbn/actions-plugin/common';
import { MessageRole } from '@kbn/inference-common';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { CrawlOutput } from '../common/crawl_step';
import type { ConnectorMemoryConfig } from './config';
import { createDayBudget, createRateLimiter, createSummaryPressure, runCrawl } from './crawl';
import { createLearnHook } from './learn';
import { createLookupTool } from './lookup';
import { MemoryStore, type Permission } from './memory';
import { createRoutes } from './routes';
import { ConnectorSettings, defaultsOf } from './settings';
import { contentSourceOf, createSource, type Execute, type Source } from './sources';
import type { Chat } from './summarize';
import type {
  ConnectorMemorySetupDependencies,
  ConnectorMemoryStartDependencies,
  Services,
} from './types';
import { crawlStep, CrawlWorkflows } from './workflow';

const DEFAULT_SPACE_ID = 'default';
const SOURCES_SYNC_EVERY_MS = 60_000;

type ActionsSpaceId = Parameters<
  ReturnType<ConnectorMemoryStartDependencies['actions']['getUnsecuredActionsClient']>['getAll']
>[0];

export class ConnectorMemoryPlugin
  implements Plugin<void, void, ConnectorMemorySetupDependencies, ConnectorMemoryStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: ConnectorMemoryConfig;
  private contracts?: { core: CoreStart; plugins: ConnectorMemoryStartDependencies };
  private syncSources?: (spaceId: string) => Promise<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<ConnectorMemoryConfig>();
  }

  /** The hooks and routes only run while serving requests, which is after start. */
  private started(): { core: CoreStart; plugins: ConnectorMemoryStartDependencies } {
    if (!this.contracts) {
      throw new Error('Connector memory used before the plugin started');
    }
    return this.contracts;
  }

  setup(
    coreSetup: CoreSetup<ConnectorMemoryStartDependencies>,
    { agentBuilder, workflowsExtensions, workflowsManagement }: ConnectorMemorySetupDependencies
  ): void {
    if (!this.config.enabled) {
      return;
    }
    const { config, logger } = this;

    const services: Services = {
      getConnector: async (request, connectorId) => {
        const client = await this.started().plugins.actions.getActionsClientWithRequest(request);
        const { actionTypeId, authMode } = await client.get({ id: connectorId });
        return { actionTypeId, authMode };
      },
      listConnectors: async (request) => {
        const client = await this.started().plugins.actions.getActionsClientWithRequest(request);
        return (await client.getAll()).map(({ id, name, actionTypeId, authMode }) => ({
          id,
          name,
          actionTypeId,
          authMode,
        }));
      },
      getSpaceId: (request) =>
        this.started().plugins.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID,
      isContextEngineEnabled: async (spaceId) => {
        const { core } = this.started();
        const uiSettings = core.uiSettings.asScopedToClient(
          core.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId)
        );
        return (await uiSettings.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID)) ?? false;
      },
      getProfileUid: async (request) =>
        (await this.started().plugins.security?.userProfiles.getCurrentProfileId({ request })) ??
        undefined,
      esClient: (request) =>
        this.started().core.elasticsearch.client.asScoped(request).asCurrentUser,
      runQuery: ({ request, esql, params, limit }) =>
        this.started()
          .plugins.contextEngine.getAiIndexDataReadService({
            esClient: services.esClient(request),
            request,
          })
          .query({ query: esql, params, limit }),
    };

    const store = new MemoryStore({
      getAiIndexService: () => this.started().plugins.contextEngine.getAiIndexService(),
      aiIndexId: config.aiIndexId,
      ttlDays: config.ttlDays,
      logger: logger.get('store'),
    });
    const settings = new ConnectorSettings({ store, defaults: defaultsOf(config) });
    const budget = createDayBudget(config.dailyReadBudget);
    const limiter = createRateLimiter(config.maxCallsPerMinute);
    const pressure = createSummaryPressure({
      maxConcurrent: config.maxConcurrentSummaries,
      perMinute: config.maxSummariesPerMinute,
    });

    /** Reads a connector as the caller, through the actions client. */
    const sourceFor = async (
      request: KibanaRequest,
      connectorId: string,
      connectorType: string
    ): Promise<Source> => {
      const client = await this.started().plugins.actions.getActionsClientWithRequest(request);
      const execute: Execute = async (subAction, subActionParams) => {
        const result = await client.execute({
          actionId: connectorId,
          params: { subAction, subActionParams },
        });
        if (result.status !== 'ok') {
          throw new Error(result.serviceMessage ?? result.message ?? `${subAction} failed`);
        }
        return result.data;
      };
      if (contentSourceOf(connectorType) === undefined) {
        throw new Error(`Connector type '${connectorType}' cannot be crawled.`);
      }
      return createSource(execute, config.maxDownloadBytes);
    };

    const chatFor = (request: KibanaRequest, connectorId: string | undefined): Chat | undefined => {
      const inference = this.started().plugins.inference;
      if (inference === undefined || connectorId === undefined) {
        return undefined;
      }
      const client = inference.getClient({ request });
      return async ({ system, user }) =>
        (
          await client.chatComplete({
            connectorId,
            system,
            messages: [{ role: MessageRole.User, content: user }],
            temperature: 0,
          })
        ).content;
    };

    // Everything memory does with a connector is this step: a scheduled crawl, an agent's read, a manual run.
    workflowsExtensions.registerStepDefinition(
      crawlStep(async ({ input, request, spaceId, signal }): Promise<CrawlOutput> => {
        const { actionTypeId, authMode } = await services.getConnector(request, input.connector_id);
        const profileUid =
          authMode === 'per-user' ? await services.getProfileUid(request) : undefined;
        if (authMode === 'per-user' && profileUid === undefined) {
          throw new Error(
            'This connector authorizes per user and the user has no profile (needs_login).'
          );
        }
        const permission: Permission =
          profileUid !== undefined ? { scope: 'per_user', profileUid } : { scope: 'connector' };
        const wantsSummaries = input.mode === 'full' || input.file_mode === 'full';
        return runCrawl(
          {
            ...(input.folder !== undefined && { folder: input.folder }),
            maxDepth: input.max_depth,
            mode: input.mode,
            files: input.files,
            entries: input.entries.map((entry) => ({ ...entry, isFolder: false, folder: '' })),
            fileMode: input.file_mode,
            ...(input.around !== undefined && { around: input.around }),
            maxItems: input.max_items,
          },
          {
            store,
            esClient: services.esClient(request),
            spaceId,
            connectorId: input.connector_id,
            connectorType: actionTypeId,
            source: await sourceFor(request, input.connector_id, actionTypeId),
            permission,
            chat: wantsSummaries
              ? chatFor(request, input.inference_connector_id ?? config.inferenceConnectorId)
              : undefined,
            budget,
            limiter,
            pressure,
            signal,
          }
        );
      })
    );

    const workflows = workflowsManagement
      ? new CrawlWorkflows({
          getManagement: () => workflowsManagement.management,
          store,
          logger: logger.get('workflows'),
        })
      : undefined;

    /** Lists every connector that supports Context Engine as a source of the memory index. */
    let lastSync = 0;
    this.syncSources = async (spaceId) => {
      if (
        Date.now() - lastSync < SOURCES_SYNC_EVERY_MS ||
        !(await services.isContextEngineEnabled(spaceId))
      ) {
        return;
      }
      lastSync = Date.now();
      const { actions } = this.started().plugins;
      const types = new Set(actions.listTypes(ContextEngineConnectorFeatureId).map(({ id }) => id));
      const connectors = await actions
        .getUnsecuredActionsClient()
        .getAll(spaceId as ActionsSpaceId);
      await store.listAsSources(
        spaceId,
        connectors.filter(({ actionTypeId }) => types.has(actionTypeId)).map(({ id }) => id)
      );
    };

    agentBuilder.tools.register(
      createLookupTool({
        target: (spaceId) => store.target(spaceId),
        runQuery: services.runQuery,
        getProfileUid: services.getProfileUid,
        gate: (request, spaceId, profileUid) => ({
          ttlMs: config.access.ttlSeconds * 1000,
          maxChecks: config.access.maxChecksPerLookup,
          canOpen: async (connectorId, fileId) => {
            const { actionTypeId } = await services.getConnector(request, connectorId);
            return (await sourceFor(request, connectorId, actionTypeId)).canOpen(fileId);
          },
          setPrincipal: (kiId, action) =>
            store.setPrincipal({
              esClient: services.esClient(request),
              spaceId,
              kiId,
              principal: profileUid,
              action,
            }),
        }),
      })
    );

    if (workflows) {
      agentBuilder.hooks.register({
        id: 'connector-memory',
        hooks: {
          [HookLifecycle.afterToolCall]: {
            mode: HookExecutionMode.nonBlocking,
            handler: createLearnHook({
              ...services,
              esClient: services.esClient,
              settings,
              sampleSize: config.learn.sampleSize,
              workflows,
              logger: logger.get('learn'),
            }),
          },
        },
      });
    }

    createRoutes({
      router: coreSetup.http.createRouter(),
      services,
      store,
      settings,
      workflows,
      syncSources: async (spaceId) => this.syncSources?.(spaceId),
    });
  }

  start(core: CoreStart, plugins: ConnectorMemoryStartDependencies): void {
    this.contracts = { core, plugins };
    // The default space has no request to trigger it: list the connectors that could feed the index now.
    void this.syncSources?.(DEFAULT_SPACE_ID)?.catch((error) =>
      this.logger.warn(`Could not list sources: ${error}`)
    );
  }

  stop(): void {}
}
