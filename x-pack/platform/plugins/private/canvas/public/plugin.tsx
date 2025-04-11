/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import { ReportingStart } from '@kbn/reporting-plugin/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  AppMountParameters,
  AppUpdater,
  DEFAULT_APP_CATEGORIES,
  PluginInitializerContext,
  AppStatus,
} from '@kbn/core/public';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { CanvasAppLocatorDefinition } from '../common/locator';
import { SESSIONSTORAGE_LASTPATH, CANVAS_APP } from '../common/lib/constants';
import { getSessionStorage } from './lib/storage';
import { initLoadingIndicator } from './lib/loading_indicator';
import { getPluginApi, CanvasApi } from './plugin_api';
import { setupExpressions } from './setup_expressions';
import { addCanvasElementTrigger } from './state/triggers/add_canvas_element_trigger';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';
import { getHasWorkpads } from './services/get_has_workpads';

export type { CoreStart, CoreSetup };

/**
 * These are the private interfaces for the services your plugin depends on.
 * @internal
 */
// This interface will be built out as we require other plugins for setup
export interface CanvasSetupDeps {
  data: DataPublicPluginSetup;
  share: SharePluginSetup;
  expressions: ExpressionsSetup;
  home?: HomePublicPluginSetup;
  usageCollection?: UsageCollectionSetup;
  charts: ChartsPluginSetup;
  uiActions: UiActionsSetup;
}

export interface CanvasStartDeps {
  embeddable: EmbeddableStart;
  expressions: ExpressionsStart;
  reporting?: ReportingStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
  charts: ChartsPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  spaces?: SpacesPluginStart;
  contentManagement: ContentManagementPublicStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
// These interfaces are empty for now but will be populate as we need to export
// things for other plugins to use at startup or runtime
export type CanvasSetup = CanvasApi;
export type CanvasStart = void;

/** @internal */
export class CanvasPlugin
  implements Plugin<CanvasSetup, CanvasStart, CanvasSetupDeps, CanvasStartDeps>
{
  private appUpdater = new BehaviorSubject<AppUpdater>(() => ({}));
  private initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(coreSetup: CoreSetup<CanvasStartDeps>, setupPlugins: CanvasSetupDeps) {
    const { api: canvasApi, registries } = getPluginApi(setupPlugins.expressions);

    // Set the nav link to the last saved url if we have one in storage
    const lastPath = getSessionStorage().get(
      `${SESSIONSTORAGE_LASTPATH}:${coreSetup.http.basePath.get()}`
    );

    if (lastPath) {
      this.appUpdater.next(() => ({
        defaultPath: `#${lastPath}`,
      }));
    }

    coreSetup.application.register({
      category: DEFAULT_APP_CATEGORIES.kibana,
      id: CANVAS_APP,
      title: 'Canvas',
      euiIconType: 'logoKibana',
      order: 3000,
      updater$: this.appUpdater,
      mount: async (params: AppMountParameters) => {
        const { CanvasSrcPlugin } = await import('../canvas_plugin_src/plugin');
        const srcPlugin = new CanvasSrcPlugin();

        srcPlugin.setup(coreSetup, { canvas: canvasApi });
        setupExpressions({ coreSetup, setupPlugins });

        // Get start services
        const [[coreStart, startPlugins]] = await Promise.all([
          coreSetup.getStartServices(),
          untilPluginStartServicesReady(),
        ]);

        srcPlugin.start(coreStart, startPlugins);

        const { expressions, presentationUtil } = startPlugins;
        await presentationUtil.registerExpressionsLanguage(
          Object.values(expressions.getFunctions())
        );

        // Load application bundle
        const { renderApp, initializeCanvas, teardownCanvas } = await import('./application');

        const canvasStore = await initializeCanvas(
          coreSetup,
          coreStart,
          setupPlugins,
          startPlugins,
          registries,
          this.appUpdater
        );

        const unmount = renderApp({
          coreStart,
          startPlugins,
          params,
          canvasStore,
          appUpdater: this.appUpdater,
        });

        return () => {
          unmount();
          teardownCanvas(coreStart);
        };
      },
    });

    getHasWorkpads(coreSetup.http).then((hasWorkpads) => {
      this.appUpdater.next(() => ({
        status: hasWorkpads ? AppStatus.accessible : AppStatus.inaccessible,
      }));
    });

    if (setupPlugins.share) {
      setupPlugins.share.url.locators.create(new CanvasAppLocatorDefinition());
    }

    canvasApi.addArgumentUIs(async () => {
      // @ts-expect-error
      const { argTypeSpecs } = await import('./expression_types/arg_types');
      return argTypeSpecs;
    });

    canvasApi.addTransitions(async () => {
      const { transitions } = await import('./transitions');
      return transitions;
    });

    setupPlugins.uiActions.registerTrigger(addCanvasElementTrigger);

    return {
      ...canvasApi,
    };
  }

  public start(coreStart: CoreStart, startPlugins: CanvasStartDeps) {
    setKibanaServices(coreStart, startPlugins, this.initContext);
    initLoadingIndicator(coreStart.http.addLoadingCountSource);
  }
}
