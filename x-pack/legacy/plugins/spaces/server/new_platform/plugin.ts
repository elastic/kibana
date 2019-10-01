/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { SavedObjectsLegacyService, CoreSetup } from 'src/core/server';
import { Logger, PluginInitializerContext } from 'src/core/server';
import { CapabilitiesModifier } from 'src/legacy/server/capabilities';
import { Legacy } from 'kibana';
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
import { initExternalSpacesApi } from '../routes/api/external';
import { getSpacesUsageCollector } from '../lib/get_spaces_usage_collector';
import { SpacesService } from './spaces_service';
import { SecurityPlugin } from '../../../security';
import { SpacesServiceSetup } from './spaces_service/spaces_service';
import { SpacesConfigType } from './config';
import { getActiveSpace } from '../lib/get_active_space';
import { toggleUICapabilities } from '../lib/toggle_ui_capabilities';
import { initSpacesRequestInterceptors } from '../lib/request_interceptors';

/**
 * Describes a set of APIs that is available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  savedObjects: SavedObjectsLegacyService;
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
  legacyConfig: {
    kibanaIndex: string;
    serverBasePath: string;
    serverDefaultRoute: string;
  };
  router: Legacy.Server['route'];
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
  registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
}

export class Plugin {
  private readonly pluginId = 'spaces';

  private readonly config$: Observable<SpacesConfigType>;

  private readonly log: Logger;

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  private spacesAuditLogger?: SpacesAuditLogger;
  private readonly getSpacesAuditLogger = () => {
    if (!this.spacesAuditLogger) {
      this.spacesAuditLogger = new SpacesAuditLogger(
        this.getLegacyAPI().auditLogger.create(this.pluginId)
      );
    }
    return this.spacesAuditLogger;
  };

  constructor(initializerContext: PluginInitializerContext) {
    this.config$ = initializerContext.config.create<SpacesConfigType>();
    this.log = initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup): Promise<SpacesPluginSetup> {
    const xpackMainPlugin: XPackMainPlugin = plugins.xpackMain;
    watchStatusAndLicenseToInitialize(xpackMainPlugin, plugins.spaces, async () => {
      await createDefaultSpace({
        elasticsearch: core.elasticsearch,
        savedObjects: this.getLegacyAPI().savedObjects,
      });
    });

    // Register a function that is called whenever the xpack info changes,
    // to re-compute the license check results for this plugin.
    xpackMainPlugin.info.feature(this.pluginId).registerLicenseCheckResultsGenerator(checkLicense);

    const service = new SpacesService(this.log, this.getLegacyAPI);

    const spacesService = await service.setup({
      http: core.http,
      elasticsearch: core.elasticsearch,
      security: plugins.security,
      getSpacesAuditLogger: this.getSpacesAuditLogger,
      config$: this.config$,
    });

    return {
      spacesService,
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.legacyAPI = legacyAPI;
        this.setupLegacyComponents(core, spacesService, plugins.xpackMain);
      },
    };
  }

  private setupLegacyComponents(
    core: CoreSetup,
    spacesService: SpacesServiceSetup,
    xpackMainPlugin: XPackMainPlugin
  ) {
    const legacyAPI = this.getLegacyAPI();

    const { addScopedSavedObjectsClientWrapperFactory, types } = legacyAPI.savedObjects;
    addScopedSavedObjectsClientWrapperFactory(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(spacesService, types)
    );

    legacyAPI.tutorial.addScopedTutorialContextFactory(
      createSpacesTutorialContextFactory(spacesService)
    );

    legacyAPI.capabilities.registerCapabilitiesModifier(async (request, uiCapabilities) => {
      const spacesClient = await spacesService.scopedClient(request);
      try {
        const activeSpace = await getActiveSpace(
          spacesClient,
          core.http.basePath.get(request),
          legacyAPI.legacyConfig.serverBasePath
        );

        const features = xpackMainPlugin.getFeatures();
        return toggleUICapabilities(features, uiCapabilities, activeSpace);
      } catch (e) {
        return uiCapabilities;
      }
    });

    // Register a function with server to manage the collection of usage stats
    legacyAPI.usage.collectorSet.register(
      getSpacesUsageCollector({
        kibanaIndex: legacyAPI.legacyConfig.kibanaIndex,
        usage: legacyAPI.usage,
        xpackMain: xpackMainPlugin,
      })
    );

    initExternalSpacesApi({
      legacyRouter: legacyAPI.router,
      log: this.log,
      savedObjects: legacyAPI.savedObjects,
      spacesService,
      xpackMain: xpackMainPlugin,
    });

    initSpacesRequestInterceptors({
      http: core.http,
      log: this.log,
      getLegacyAPI: this.getLegacyAPI,
      spacesService,
      xpackMain: xpackMainPlugin,
    });
  }
}
