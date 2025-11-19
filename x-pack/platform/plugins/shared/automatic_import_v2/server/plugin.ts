/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreStart,
  Plugin,
  Logger,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { ReplaySubject, type Subject } from 'rxjs';
import type {
  AutomaticImportV2PluginCoreSetupDependencies,
  AutomaticImportV2PluginSetup,
  AutomaticImportV2PluginSetupDependencies,
  AutomaticImportV2PluginStart,
  AutomaticImportV2PluginStartDependencies,
  AutomaticImportV2PluginRequestHandlerContext,
} from './types';
import { RequestContextFactory } from './request_context_factory';
import { AutomaticImportService } from './services';
import { TaskManagerService } from './services/task_manager';
import { AgentService } from './services/agents/agent_service';
import { AutomaticImportSamplesIndexService } from './services/samples_index/index_service';

export class AutomaticImportV2Plugin
  implements
    Plugin<
      AutomaticImportV2PluginSetup,
      AutomaticImportV2PluginStart,
      AutomaticImportV2PluginSetupDependencies,
      AutomaticImportV2PluginStartDependencies
    >
{
  private readonly logger: Logger;
  private pluginStop$: Subject<void>;
  private readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  private automaticImportService: AutomaticImportService | null = null;
  private taskManagerService: TaskManagerService | null = null;

  constructor(initializerContext: PluginInitializerContext) {
    this.pluginStop$ = new ReplaySubject(1);
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  /**
   * Setup the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginSetup
   */
  public setup(
    core: AutomaticImportV2PluginCoreSetupDependencies,
    plugins: AutomaticImportV2PluginSetupDependencies
  ) {
    this.logger.debug('automaticImportV2: Setup');

    const coreStartServices = core.getStartServices().then(([coreStart]) => ({
      esClient: coreStart.elasticsearch.client.asInternalUser as ElasticsearchClient,
    }));
    const esClientPromise = coreStartServices.then(({ esClient }) => esClient);

    this.automaticImportService = new AutomaticImportService(
      this.logger,
      esClientPromise,
      core.savedObjects
    );

    this.taskManagerService = new TaskManagerService(this.logger, plugins.taskManager);

    const requestContextFactory = new RequestContextFactory({
      logger: this.logger,
      core,
      plugins,
      kibanaVersion: this.kibanaVersion,
      automaticImportService: this.automaticImportService,
      taskManagerService: this.taskManagerService,
    });

    core.http.registerRouteHandlerContext<
      AutomaticImportV2PluginRequestHandlerContext,
      'automaticImportv2'
    >('automaticImportv2', (context, request) => requestContextFactory.create(context, request));
    return {
      actions: plugins.actions,
    };
  }

  /**
   * Start the plugin
   * @param core
   * @param plugins
   * @returns AutomaticImportPluginStart
   */
  public start(
    core: CoreStart,
    plugins: AutomaticImportV2PluginStartDependencies
  ): AutomaticImportV2PluginStart {
    this.logger.debug('automaticImportV2: Started');

    if (!this.automaticImportService || !this.taskManagerService) {
      throw new Error('Services not initialized during setup');
    }

    if (!plugins.security) {
      throw new Error('Security service not initialized.');
    }

    if (!core.savedObjects) {
      throw new Error('SavedObjects service not initialized.');
    }

    if (!plugins.taskManager) {
      throw new Error('TaskManager service not initialized.');
    }

    this.automaticImportService
      .initialize(core.security, core.savedObjects)
      .then(() => {
        this.logger.debug('AutomaticImportService initialized successfully');
      })
      .catch((error) => {
        this.logger.error('Failed to initialize AutomaticImportService', error);
      });

    this.taskManagerService.initialize(plugins.taskManager, {
      invokeDeepAgent: this.createInvokeDeepAgentFactory(core, plugins),
    });

    this.logger.info('TaskManagerService initialized successfully');

    return {
      actions: plugins.actions,
      inference: plugins.inference,
      licensing: plugins.licensing,
      security: plugins.security,
    };
  }

  /**
   * Get the connector ID to use for AI workflows for use in the AgentService factory
   * @param core - Core start contract
   * @param fakeRequest - User-scoped request
   * @param connectorId - Optional explicitly provided connector ID
   * @returns The resolved connector ID
   */
  private async getConnectorId(
    core: CoreStart,
    fakeRequest: KibanaRequest,
    connectorId?: string
  ): Promise<string> {
    if (connectorId) {
      this.logger.debug(`Using connector ID: ${connectorId}`);
      return connectorId;
    }

    // Else get user's default connector from settings
    try {
      const soClient = core.savedObjects.getScopedClient(fakeRequest);
      const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);

      const defaultConnectorSetting = await uiSettingsClient.get<string>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
      );

      if (defaultConnectorSetting && defaultConnectorSetting !== 'NO_DEFAULT_CONNECTOR') {
        this.logger.debug(
          `Using user's default connector from UI settings: ${defaultConnectorSetting}`
        );
        return defaultConnectorSetting;
      }
    } catch (error) {
      this.logger.warn('Failed to get default connector from UI settings', error);
    }

    throw new Error('No AI connectors available for automatic import workflow');
  }

  /**
   * Creates a factory function for user-scoped deep agent invocation
   * @param core - Core start contract
   * @param plugins - Plugin start dependencies
   * @returns Factory function that creates user-scoped AgentService instances
   */
  private createInvokeDeepAgentFactory(
    core: CoreStart,
    plugins: AutomaticImportV2PluginStartDependencies
  ) {
    return async (integrationId: string, dataStreamId: string, fakeRequest?: KibanaRequest) => {
      if (!fakeRequest) {
        throw new Error('User context required for AI workflow execution');
      }

      const userEsClient = core.elasticsearch.client.asScoped(fakeRequest);

      let connectorId: string;
      try {
        const task = await plugins.taskManager.get(`ai-task-${integrationId}-${dataStreamId}`);
        connectorId = await this.getConnectorId(core, fakeRequest, task.params.connectorId);
      } catch (error) {
        this.logger.warn(
          `Failed to retrieve task for connector ID, resolving from settings: ${error}`
        );
        connectorId = await this.getConnectorId(core, fakeRequest);
      }

      const userModel = await plugins.inference.getChatModel({
        connectorId,
        request: fakeRequest,
        chatModelOptions: {},
      });

      const samplesIndexService = new AutomaticImportSamplesIndexService(
        this.logger,
        Promise.resolve(userEsClient.asCurrentUser)
      );

      const agentService = new AgentService(
        userEsClient.asCurrentUser,
        samplesIndexService,
        userModel
      );

      return await agentService.invoke_deep_agent(integrationId, dataStreamId);
    };
  }

  /**
   * Stop the plugin
   */
  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
    this.automaticImportService?.stop();
  }
}
