/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerRoute } from 'hapi';
import { Observable } from 'rxjs';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { SavedObjectsService } from 'src/core/server';
import {
  Logger,
  HttpServiceSetup,
  PluginInitializerContext,
  ElasticsearchServiceSetup,
} from 'src/core/server';
import { CapabilitiesModifier } from 'src/legacy/server/capabilities';
import { OptionalPlugin } from '../../../../server/lib/optional_plugin';
import { XPackMainPlugin } from '../../../xpack_main/xpack_main';
import { createDefaultSpace } from '../lib/create_default_space';
// @ts-ignore
import { AuditLogger } from '../../../../server/lib/audit_logger';
// @ts-ignore
import { watchStatusAndLicenseToInitialize } from '../../../../server/lib/watch_status_and_license_to_initialize';
import { checkLicense } from '../lib/check_license';
import { spacesSavedObjectsClientWrapperFactory } from '../lib/saved_objects_client/saved_objects_client_wrapper_factory';
import { SpacesAuditLogger } from '../lib/audit_logger';
import { createSpacesTutorialContextFactory } from '../lib/spaces_tutorial_context_factory';
import { initInternalApis } from '../routes/api/v1';
import { initExternalSpacesApi } from '../routes/api/external';
import { getSpacesUsageCollector } from '../lib/get_spaces_usage_collector';
import { SpacesService } from './spaces_service';
import { SecurityPlugin } from '../../../security';
import { SpacesServiceSetup } from './spaces_service/spaces_service';
import { SpacesConfigType } from './config';
import { getActiveSpace } from '../lib/get_active_space';
import { toggleUICapabilities } from '../lib/toggle_ui_capabilities';

export interface SpacesHttpServiceSetup extends HttpServiceSetup {
  route(route: ServerRoute | ServerRoute[]): void;
}
export interface SpacesCoreSetup {
  http: SpacesHttpServiceSetup;
  savedObjects: SavedObjectsService;
  elasticsearch: ElasticsearchServiceSetup;
  usage: {
    collectorSet: {
      register: (collector: any) => void;
    };
  };
  tutorial: {
    addScopedTutorialContextFactory: (factory: any) => void;
  };
  capabilities: {
    registerCapabilitiesModifier: (provider: CapabilitiesModifier) => void;
  };
  auditLogger: {
    create: (pluginId: string) => AuditLogger;
  };
}

export interface PluginsSetup {
  // TODO: Spaces has a circular dependency with Security right now.
  // Security is not yet available when init runs, so this is wrapped in an optional plugin for the time being.
  security: OptionalPlugin<SecurityPlugin>;
  xpackMain: XPackMainPlugin;
  // TODO: this is temporary for `watchLicenseAndStatusToInitialize`
  spaces: any;
}

export interface SpacesPluginSetup {
  spacesService: SpacesServiceSetup;
  // TODO: this is temporary, required by request interceptors which are initialized in legacy plugin
  log: Logger;
}

export interface SpacesInitializerContext extends PluginInitializerContext {
  legacyConfig: KibanaConfig;
}
export class Plugin {
  private readonly pluginId = 'spaces';

  private config$: Observable<SpacesConfigType>;

  private log: Logger;

  constructor(private readonly initializerContext: SpacesInitializerContext) {
    this.config$ = initializerContext.config.create<SpacesConfigType>();
    this.log = initializerContext.logger.get();
  }

  public async setup(core: SpacesCoreSetup, plugins: PluginsSetup): Promise<SpacesPluginSetup> {
    const xpackMainPlugin: XPackMainPlugin = plugins.xpackMain;
    watchStatusAndLicenseToInitialize(xpackMainPlugin, plugins.spaces, async () => {
      await createDefaultSpace({
        elasticsearch: core.elasticsearch,
        savedObjects: core.savedObjects,
      });
    });

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin.
    xpackMainPlugin.info.feature(this.pluginId).registerLicenseCheckResultsGenerator(checkLicense);

    const spacesAuditLogger = new SpacesAuditLogger(core.auditLogger.create(this.pluginId));

    const service = new SpacesService(
      this.log,
      this.initializerContext.legacyConfig.get('server.basePath')
    );
    const spacesService = await service.setup({
      http: core.http,
      elasticsearch: core.elasticsearch,
      savedObjects: core.savedObjects,
      security: plugins.security,
      spacesAuditLogger,
      config$: this.config$,
    });

    const { addScopedSavedObjectsClientWrapperFactory, types } = core.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(
      Number.MAX_SAFE_INTEGER - 1,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );

    core.tutorial.addScopedTutorialContextFactory(
      createSpacesTutorialContextFactory(spacesService)
    );

    core.capabilities.registerCapabilitiesModifier(async (request, uiCapabilities) => {
      const spacesClient = await spacesService.scopedClient(request);
      try {
        const activeSpace = await getActiveSpace(
          spacesClient,
          core.http.basePath.get(request),
          this.initializerContext.legacyConfig.get('server.basePath')
        );

        const features = plugins.xpackMain.getFeatures();
        return toggleUICapabilities(features, uiCapabilities, activeSpace);
      } catch (e) {
        return uiCapabilities;
      }
    });

    initInternalApis({
      http: core.http,
      config: this.initializerContext.legacyConfig,
      savedObjects: core.savedObjects,
      spacesService,
      xpackMain: xpackMainPlugin,
    });

    initExternalSpacesApi({
      http: core.http,
      log: this.log,
      savedObjects: core.savedObjects,
      spacesService,
      xpackMain: xpackMainPlugin,
    });

    // Register a function with server to manage the collection of usage stats
    core.usage.collectorSet.register(
      getSpacesUsageCollector({
        config: this.initializerContext.legacyConfig,
        usage: core.usage,
        xpackMain: xpackMainPlugin,
      })
    );

    return {
      spacesService,
      log: this.log,
    };
  }
}
