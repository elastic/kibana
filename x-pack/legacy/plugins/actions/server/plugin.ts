/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { ActionsConfigType, Services } from './types';
import { ActionExecutor, TaskRunnerFactory } from './lib';
import { ActionsClient } from './actions_client';
import { ActionTypeRegistry } from './action_type_registry';
import { ExecuteOptions } from './create_execute_function';
import { createExecuteFunction } from './create_execute_function';
import { registerBuiltInActionTypes } from './builtin_action_types';
import { IClusterClient, KibanaRequest, Logger } from '../../../../../src/core/server';
import { getActionsConfigurationUtilities } from './actions_config';
import {
  ActionsPluginInitializerContext,
  ActionsCoreSetup,
  ActionsCoreStart,
  ActionsPluginsSetup,
  ActionsPluginsStart,
  KibanaConfig,
} from './shim';
import {
  createActionRoute,
  deleteActionRoute,
  findActionRoute,
  getActionRoute,
  updateActionRoute,
  listActionTypesRoute,
  getExecuteActionRoute,
} from './routes';
import { extendRouteWithLicenseCheck } from './extend_route_with_license_check';
import { LicenseState } from './lib/license_state';

export interface PluginSetupContract {
  registerType: ActionTypeRegistry['register'];
}

export interface PluginStartContract {
  listTypes: ActionTypeRegistry['list'];
  execute(options: ExecuteOptions): Promise<void>;
  getActionsClientWithRequest(request: Hapi.Request): ActionsClient;
}

export class Plugin {
  private readonly kibana$: Observable<KibanaConfig>;
  private readonly config$: Observable<ActionsConfigType>;
  private readonly logger: Logger;
  private serverBasePath?: string;
  private adminClient?: IClusterClient;
  private taskRunnerFactory?: TaskRunnerFactory;
  private actionTypeRegistry?: ActionTypeRegistry;
  private actionExecutor?: ActionExecutor;
  private defaultKibanaIndex?: string;
  private licenseState: LicenseState | null = null;

  constructor(initializerContext: ActionsPluginInitializerContext) {
    this.logger = initializerContext.logger.get('plugins', 'alerting');
    this.config$ = initializerContext.config.create();
    this.kibana$ = initializerContext.config.kibana$;
  }

  public async setup(
    core: ActionsCoreSetup,
    plugins: ActionsPluginsSetup
  ): Promise<PluginSetupContract> {
    const config = await this.config$.pipe(first()).toPromise();
    this.adminClient = core.elasticsearch.adminClient;
    this.defaultKibanaIndex = (await this.kibana$.pipe(first()).toPromise()).index;

    this.licenseState = new LicenseState(plugins.licensing.license$);

    // Encrypted attributes
    // - `secrets` properties will be encrypted
    // - `config` will be included in AAD
    // - everything else excluded from AAD
    plugins.encryptedSavedObjects.registerType({
      type: 'action',
      attributesToEncrypt: new Set(['secrets']),
      attributesToExcludeFromAAD: new Set(['name']),
    });
    plugins.encryptedSavedObjects.registerType({
      type: 'action_task_params',
      attributesToEncrypt: new Set(['apiKey']),
    });

    const actionExecutor = new ActionExecutor();
    const taskRunnerFactory = new TaskRunnerFactory(actionExecutor);
    const actionsConfigUtils = getActionsConfigurationUtilities(config as ActionsConfigType);
    const actionTypeRegistry = new ActionTypeRegistry({
      taskRunnerFactory,
      taskManager: plugins.task_manager,
      actionsConfigUtils,
    });
    this.taskRunnerFactory = taskRunnerFactory;
    this.actionTypeRegistry = actionTypeRegistry;
    this.serverBasePath = core.http.basePath.serverBasePath;
    this.actionExecutor = actionExecutor;

    registerBuiltInActionTypes({
      logger: this.logger,
      actionTypeRegistry,
      actionsConfigUtils,
    });

    // Routes
    core.http.route(extendRouteWithLicenseCheck(createActionRoute, this.licenseState));
    core.http.route(extendRouteWithLicenseCheck(deleteActionRoute, this.licenseState));
    core.http.route(extendRouteWithLicenseCheck(getActionRoute, this.licenseState));
    core.http.route(extendRouteWithLicenseCheck(findActionRoute, this.licenseState));
    core.http.route(extendRouteWithLicenseCheck(updateActionRoute, this.licenseState));
    core.http.route(extendRouteWithLicenseCheck(listActionTypesRoute, this.licenseState));
    core.http.route(
      extendRouteWithLicenseCheck(getExecuteActionRoute(actionExecutor), this.licenseState)
    );

    return {
      registerType: actionTypeRegistry.register.bind(actionTypeRegistry),
    };
  }

  public start(core: ActionsCoreStart, plugins: ActionsPluginsStart): PluginStartContract {
    const {
      logger,
      actionExecutor,
      actionTypeRegistry,
      adminClient,
      serverBasePath,
      taskRunnerFactory,
      defaultKibanaIndex,
    } = this;

    function getServices(request: any): Services {
      return {
        callCluster: (...args) =>
          adminClient!.asScoped(KibanaRequest.from(request)).callAsCurrentUser(...args),
        savedObjectsClient: core.savedObjects.getScopedSavedObjectsClient(request),
      };
    }
    function spaceIdToNamespace(spaceId?: string): string | undefined {
      const spacesPlugin = plugins.spaces();
      return spacesPlugin && spaceId ? spacesPlugin.spaceIdToNamespace(spaceId) : undefined;
    }
    function getBasePath(spaceId?: string): string {
      const spacesPlugin = plugins.spaces();
      return spacesPlugin && spaceId ? spacesPlugin.getBasePath(spaceId) : serverBasePath!;
    }

    actionExecutor!.initialize({
      logger,
      spaces: plugins.spaces,
      getServices,
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      actionTypeRegistry: actionTypeRegistry!,
    });
    taskRunnerFactory!.initialize({
      encryptedSavedObjectsPlugin: plugins.encryptedSavedObjects,
      getBasePath,
      spaceIdToNamespace,
    });

    const executeFn = createExecuteFunction({
      taskManager: plugins.task_manager,
      getScopedSavedObjectsClient: core.savedObjects.getScopedSavedObjectsClient,
      getBasePath,
    });

    return {
      execute: executeFn,
      listTypes: actionTypeRegistry!.list.bind(actionTypeRegistry!),
      getActionsClientWithRequest(request: Hapi.Request) {
        const savedObjectsClient = request.getSavedObjectsClient();
        return new ActionsClient({
          savedObjectsClient,
          actionTypeRegistry: actionTypeRegistry!,
          defaultKibanaIndex: defaultKibanaIndex!,
          scopedClusterClient: adminClient!.asScoped(request),
        });
      },
    };
  }

  public stop() {
    if (this.licenseState) {
      this.licenseState.clean();
    }
  }
}
