/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { Logger } from '@kbn/logging';
import { PLUGIN_ID, PLUGIN_NAME, EVALS_API_PRIVILEGES, EVALS_UI_PRIVILEGES } from '../common';
import type { EvalsConfig } from './config';
import { createEvaluatorRegistry } from './evaluators/registry';
import type { EvaluatorRegistry } from './evaluators/types';
import {
  EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
  evalsRemoteKibanaConfigSavedObjectType,
} from './saved_objects/remote_kibana_config';
import type {
  EvalsRequestHandlerContext,
  EvalsPluginSetup,
  EvalsPluginStart,
  EvalsSetupDependencies,
  EvalsStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { DatasetService } from './storage/datasets/dataset_service';
import { EvaluatorDefinitionService } from './storage/evaluators/evaluator_definition_service';
import { EvaluationScoreService } from './storage/scores/evaluation_score_service';
import { evaluationsDataStreamDefinition } from './storage/scores/scores_index_template';
import { OnlineScoreService } from './storage/scores/online_score_service';
import { onlineScoresDataStreamDefinition } from './storage/scores/online_scores_index_template';
import { createTaskProviderRegistry } from './task_providers/registry';
import type { TaskProviderRegistry } from './task_providers/types';
import { registerEvalsWorkflowSteps } from './workflows';

export class EvalsPlugin
  implements
    Plugin<EvalsPluginSetup, EvalsPluginStart, EvalsSetupDependencies, EvalsStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: EvalsConfig;
  private readonly isServerless: boolean;
  private evaluatorRegistry?: EvaluatorRegistry;
  private datasetService?: DatasetService;
  private evaluationScoreService?: EvaluationScoreService;
  private evaluatorDefinitionService?: EvaluatorDefinitionService;
  private taskProviderRegistry?: TaskProviderRegistry;
  private onlineScoreService?: OnlineScoreService;

  constructor(context: PluginInitializerContext<EvalsConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(
    coreSetup: CoreSetup<EvalsStartDependencies, EvalsPluginStart>,
    {
      features,
      encryptedSavedObjects,
      workflowsExtensions,
      workflowsManagement,
    }: EvalsSetupDependencies
  ): EvalsPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Evals plugin is disabled');
      return { enabled: false, registerTaskProvider: () => {} };
    }

    this.logger.info('Setting up Evals plugin');
    coreSetup.dataStreams.registerDataStream(evaluationsDataStreamDefinition);
    coreSetup.dataStreams.registerDataStream(onlineScoresDataStreamDefinition);

    this.taskProviderRegistry = createTaskProviderRegistry();

    coreSetup.savedObjects.registerType(evalsRemoteKibanaConfigSavedObjectType);
    encryptedSavedObjects.registerType({
      type: EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE,
      attributesToEncrypt: new Set(['apiKey']),
      attributesToIncludeInAAD: new Set(['createdAt', 'url']),
    });
    this.evaluatorRegistry = createEvaluatorRegistry({
      getDefinitionClient: ({ spaceId }) => this.evaluatorDefinitionService?.getClient({ spaceId }),
    });

    coreSetup.http.registerRouteHandlerContext<EvalsRequestHandlerContext, 'evals'>(
      'evals',
      async () => {
        if (
          !this.datasetService ||
          !this.evaluationScoreService ||
          !this.onlineScoreService ||
          !this.evaluatorDefinitionService ||
          !this.evaluatorRegistry
        ) {
          throw new Error('Evals storage services have not been initialized');
        }

        return {
          datasetService: this.datasetService,
          evaluationScoreService: this.evaluationScoreService,
          onlineScoreService: this.onlineScoreService,
          evaluatorDefinitionService: this.evaluatorDefinitionService,
          evaluatorRegistry: this.evaluatorRegistry,
        };
      }
    );

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 9000,
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: ['kibana', PLUGIN_ID],
      management: { ai: [PLUGIN_ID] },
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [EVALS_API_PRIVILEGES.read, EVALS_API_PRIVILEGES.manage],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [EVALS_UI_PRIVILEGES.show, EVALS_UI_PRIVILEGES.manage],
        },
        read: {
          app: ['kibana', PLUGIN_ID],
          api: [EVALS_API_PRIVILEGES.read],
          management: { ai: [PLUGIN_ID] },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [EVALS_UI_PRIVILEGES.show],
        },
      },
    });

    const router = coreSetup.http.createRouter<EvalsRequestHandlerContext>();
    const internalRemoteConfigsSoClientPromise = coreSetup.getStartServices().then(([coreStart]) =>
      coreStart.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [EVALS_REMOTE_KIBANA_CONFIG_SAVED_OBJECT_TYPE],
      })
    );

    const getInferenceStart = () =>
      coreSetup.getStartServices().then(([, pluginsStart]) => pluginsStart.inference);

    const getSpaceId = async (request: KibanaRequest): Promise<string> => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      return pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    };

    const getCurrentUsername = async (request: KibanaRequest): Promise<string | undefined> => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      return pluginsStart.security?.authc.getCurrentUser(request)?.username;
    };

    // When security is disabled there is no per-space authz to enforce, so grant.
    const checkManageEvalsPrivileges = async (
      request: KibanaRequest,
      spaceIds: string[]
    ): Promise<boolean> => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const security = pluginsStart.security;
      if (!security) {
        return true;
      }
      const { hasAllRequested } = await security.authz
        .checkPrivilegesWithRequest(request)
        .atSpaces(spaceIds, {
          kibana: [security.authz.actions.api.get(EVALS_API_PRIVILEGES.manage)],
        });
      return hasAllRequested;
    };

    /**
     * Spaces the caller can see, for rejecting writes that name an unknown one
     * and redacting the rest out of reads. The spaces client already filters by
     * authorization.
     */
    const getAccessibleSpaceIds = async (request: KibanaRequest): Promise<string[]> => {
      const [, pluginsStart] = await coreSetup.getStartServices();
      const spaces = pluginsStart.spaces;
      if (!spaces) {
        return [DEFAULT_SPACE_ID];
      }
      const allSpaces = await spaces.spacesService.createSpacesClient(request).getAll();
      return allSpaces.map(({ id }) => id);
    };

    registerRoutes({
      router,
      logger: this.logger,
      canEncrypt: encryptedSavedObjects.canEncrypt,
      evaluatorRegistry: this.evaluatorRegistry,
      getInferenceStart,
      getEncryptedSavedObjectsStart: () =>
        coreSetup.getStartServices().then(([, pluginsStart]) => pluginsStart.encryptedSavedObjects),
      getInternalRemoteConfigsSoClient: () => internalRemoteConfigsSoClientPromise,
      getSpaceId,
      getCurrentUsername,
      checkManageEvalsPrivileges,
      getAccessibleSpaceIds,
      taskProviderRegistry: this.taskProviderRegistry,
      workflowsManagement,
    });

    if (workflowsExtensions) {
      registerEvalsWorkflowSteps(workflowsExtensions, {
        logger: this.logger,
        taskProviderRegistry: this.taskProviderRegistry,
        getInferenceStart,
      });
    } else {
      this.logger.debug(
        'workflowsExtensions plugin is not available. Evals workflow steps were not registered'
      );
    }

    const taskProviderRegistry = this.taskProviderRegistry;
    return {
      enabled: true,
      registerTaskProvider: (provider) => taskProviderRegistry.register(provider),
    };
  }

  start(coreStart: CoreStart, plugins: EvalsStartDependencies): EvalsPluginStart {
    if (!this.config.enabled) {
      return {};
    }

    const evaluatorRegistry = this.evaluatorRegistry;
    if (!evaluatorRegistry) {
      throw new Error('Evaluator registry has not been initialized');
    }

    this.datasetService = new DatasetService(
      this.logger,
      coreStart.elasticsearch.client.asInternalUser,
      this.isServerless
    );
    this.evaluationScoreService = new EvaluationScoreService(this.logger, coreStart.dataStreams);
    this.evaluatorDefinitionService = new EvaluatorDefinitionService(
      this.logger,
      coreStart.elasticsearch.client.asInternalUser,
      this.isServerless,
      evaluatorRegistry.isBuiltIn
    );
    this.onlineScoreService = new OnlineScoreService(this.logger, coreStart.dataStreams);

    return {
      datasetService: this.datasetService,
      evaluationScoreService: this.evaluationScoreService,
      listEvaluators: async ({ spaceId }) => {
        const definitions = await evaluatorRegistry.asScoped({ spaceId }).list();

        return definitions.map((def) => ({
          name: def.name,
          version: def.version,
          kind: def.kind,
          origin: def.origin,
          description: def.description,
          needsJudgeConnector: def.kind === 'llm',
        }));
      },
      listModelConnectors: async (request) => {
        const connectors = await plugins.inference.getConnectorList(request);
        return connectors.map((connector) => ({
          id: connector.connectorId,
          name: connector.name,
          type: connector.type,
        }));
      },
      onlineScoreService: this.onlineScoreService,
    };
  }

  stop() {}
}
