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
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { Composition, KibanaIsomerRuntime, PrimitiveNode } from '@kbn/isomer';
import { firstValueFrom } from 'rxjs';
import { MATERIALIZE_FEATURE_FLAG } from '../common/constants';
import type { MaterializeEvent, RenderEvent } from './instrumentation/events';
import type { PngEvent } from './instrumentation/events';
import { MATERIALIZE_EVENT, PNG_EVENT, RENDER_EVENT } from './instrumentation/events';
import { instrumentRuntime } from './instrumentation/instrument_runtime';
import { createScopedMaterializeClient } from './materialize/materialize_client';
import { createHasField } from './materialize/has_field';
import { createKitServices } from './materialize/kit/create_kit';
import type { LensTransformOut } from './materialize/lens/materializer';
import { LENS_TYPE, createLensMaterializer } from './materialize/lens/materializer';
import { MaterializerRegistry } from './materialize/registry';
import { createNodeValidator } from './materialize/validate_node';
import type { MaterializeScope, Materializer, ScopedMaterializeClient } from './materialize/types';
import { abortSignalFor } from './materialize/abort_signal';
import {
  DASHBOARD_SAVED_OBJECT_TYPE,
  createDashboardMaterializer,
} from './materializers/dashboard';
import { IMAGE_PANEL_TYPE, createImageMaterializer } from './materializers/image';
import { LINKS_SAVED_OBJECT_TYPE, createLinksMaterializer } from './materializers/links';
import { MARKDOWN_SAVED_OBJECT_TYPE, createMarkdownMaterializer } from './materializers/markdown';
import { registerFiltersForSelectionRoute } from './routes/filters_for_selection_route';
import { registerMaterializeRoute } from './routes/materialize_route';
import { registerRenderPngRoute } from './routes/render_png_route';
import type { ChartPngHost, ChartPngOptions, ChartPngResult } from './render/png_host';
import { createChartPngHost } from './render/png_host';
import { createLazyHeadlessRenderer } from './render/headless_renderer';

/** Setup contract for registering materializers before the plugin starts. */
export interface IsomerPluginSetup {
  /**
   * Registers a materializer for one saved object type. Each type can be registered only once.
   *
   * @param type Saved object type handled by the materializer.
   * @param materializer Parser, planner, and mapper for that type's as-code config.
   */
  registerMaterializer: <TConfig>(type: string, materializer: Materializer<TConfig>) => void;
}

/** Options for creating a request-scoped materialization client. */
export interface AsScopedOptions {
  /** Cancels materializer work. Defaults to the abort signal for the request. */
  abortSignal?: AbortSignal;
}

/** Plugins the Isomer plugin uses once it starts. */
export interface IsomerPluginStartDependencies {
  data: DataPluginStart;
  fieldFormats: FieldFormatsStart;
  embeddable?: EmbeddableStart;
}

/** Start contract for the Isomer runtime and user-scoped materialization. */
export interface IsomerPluginStart {
  /** Loads the shared runtime and primitive packs on first use. */
  getRuntime: () => Promise<KibanaIsomerRuntime>;
  /** Resolves whether materialization is enabled by the current feature-flag evaluation. */
  isMaterializeEnabled: () => Promise<boolean>;
  /**
   * Creates a client that loads saved objects and materializes them as the user who made `request`.
   *
   * @param request Authenticated Kibana request that scopes saved-object access.
   * @param options Optional abort signal for work started by the client.
   */
  asScoped: (request: KibanaRequest, options?: AsScopedOptions) => ScopedMaterializeClient;
  /**
   * Draws a materialized node, or a composition, to a PNG in Kibana's process, behind the
   * `isomer.materializeEnabled` flag. The image runtime, takumi and headless Elastic Charts load
   * on the first call. At most two renders run at once; past a short queue it throws
   * `RenderBusyError`.
   */
  renderPng: (
    input: PrimitiveNode | Composition,
    options?: ChartPngOptions
  ) => Promise<ChartPngResult>;
}

// The shared runtime draws charts with headless Elastic Charts on the server; the engine loads on
// the first chart drawn, not when the runtime is built.
const createRuntime = async (): Promise<KibanaIsomerRuntime> => {
  const [{ createKibanaIsomerRuntime, loadKibanaChartsPack }, { componentsPackWithCharts }] =
    await Promise.all([import('@kbn/isomer'), import('@kbn/isomer-components')]);
  const chartsPack = await loadKibanaChartsPack({
    environment: 'server',
    sceneRenderers: [createLazyHeadlessRenderer()],
  });
  return createKibanaIsomerRuntime({ packs: [componentsPackWithCharts, chartsPack] });
};

/** Registers the materialization API and exposes the shared Isomer runtime. */
export class IsomerPlugin
  implements Plugin<IsomerPluginSetup, IsomerPluginStart, object, IsomerPluginStartDependencies>
{
  private readonly logger: Logger;
  private readonly kibanaVersion: string;
  private data?: DataPluginStart;
  private fieldFormats?: FieldFormatsStart;
  private embeddable?: EmbeddableStart;
  private uiSettings?: CoreStart['uiSettings'];
  private elasticsearch?: CoreStart['elasticsearch'];
  private reportEvent?: CoreStart['analytics']['reportEvent'];
  private readonly registry = new MaterializerRegistry();
  private runtime?: Promise<KibanaIsomerRuntime>;
  private featureFlags?: CoreStart['featureFlags'];
  private pngHost?: ChartPngHost;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  setup(core: CoreSetup): IsomerPluginSetup {
    core.analytics.registerEventType(MATERIALIZE_EVENT);
    core.analytics.registerEventType(RENDER_EVENT);
    core.analytics.registerEventType(PNG_EVENT);
    const router = core.http.createRouter();
    registerMaterializeRoute({ router, createClient: this.createClient });
    registerRenderPngRoute({
      router,
      createClient: this.createClient,
      getPngHost: this.getPngHost,
    });
    registerFiltersForSelectionRoute({
      router,
      createClient: this.createClient,
      validateNode: this.validateNode,
    });
    const getKibanaUrl = (request: KibanaRequest) => {
      const { basePath } = core.http;
      const origin = basePath.publicBaseUrl ? new URL(basePath.publicBaseUrl).origin : '';
      return `${origin}${basePath.get(request)}`;
    };
    this.registry.register(
      LENS_TYPE,
      createLensMaterializer({
        getTransformOut: () =>
          this.embeddable?.getTransforms(LENS_TYPE)?.transformOut as LensTransformOut | undefined,
        basePath: core.http.basePath,
      })
    );
    this.registry.register(
      DASHBOARD_SAVED_OBJECT_TYPE,
      createDashboardMaterializer({
        // Resolved at runtime: a plugin dependency on dashboard would be a cycle through
        // observabilityAIAssistant and agentBuilder, which depend on isomer.
        getDashboard: async () => {
          const { dashboard } = await core.plugins.onStart<{ dashboard: DashboardPluginStart }>(
            'dashboard'
          );
          return dashboard.found ? dashboard.contract : undefined;
        },
        getDataViews: async ({ request, savedObjectsClient }) => {
          const { data, elasticsearch } = this.startServices();
          return data.indexPatterns.dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearch.client.asScoped(request).asCurrentUser,
            request
          );
        },
        getUiSettings: ({ savedObjectsClient }) =>
          this.startServices().uiSettings.asScopedToClient(savedObjectsClient),
        getKibanaUrl,
      })
    );
    this.registry.register(MARKDOWN_SAVED_OBJECT_TYPE, createMarkdownMaterializer());
    this.registry.register(IMAGE_PANEL_TYPE, createImageMaterializer());
    this.registry.register(LINKS_SAVED_OBJECT_TYPE, createLinksMaterializer({ getKibanaUrl }));
    return {
      registerMaterializer: (type, materializer) => this.registry.register(type, materializer),
    };
  }

  start(
    core: CoreStart,
    { data, fieldFormats, embeddable }: IsomerPluginStartDependencies
  ): IsomerPluginStart {
    this.data = data;
    this.fieldFormats = fieldFormats;
    this.embeddable = embeddable;
    this.uiSettings = core.uiSettings;
    this.elasticsearch = core.elasticsearch;
    this.reportEvent = core.analytics.reportEvent;
    this.featureFlags = core.featureFlags;
    return {
      getRuntime: this.getRuntime,
      isMaterializeEnabled: this.isMaterializeEnabled,
      asScoped: (request, { abortSignal } = {}) =>
        this.createClient({
          request,
          savedObjectsClient: core.savedObjects.getScopedClient(request),
          abortSignal: abortSignal ?? abortSignalFor(request),
        }),
      renderPng: async (input, options) => {
        if (!(await this.isMaterializeEnabled())) {
          throw new Error('Drawing PNGs is off with materialization (isomer.materializeEnabled).');
        }
        return this.getPngHost().renderPng(input, options);
      },
    };
  }

  async stop() {
    await this.pngHost?.close();
  }

  private readonly getPngHost = (): ChartPngHost => {
    this.pngHost ??= createChartPngHost({
      logger: this.logger.get('png'),
      report: this.reportPng,
    });
    return this.pngHost;
  };

  private readonly reportPng = (event: PngEvent) => {
    this.reportEvent?.(PNG_EVENT.eventType, event);
  };

  private readonly startServices = () => {
    const { data, uiSettings, elasticsearch } = this;
    if (!data || !uiSettings || !elasticsearch) {
      throw new Error('The isomer plugin materializes only after it starts.');
    }
    return { data, uiSettings, elasticsearch };
  };

  private readonly isMaterializeEnabled = async (): Promise<boolean> => {
    if (!this.featureFlags) {
      return false;
    }
    // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- evaluated per materialization action
    return firstValueFrom(this.featureFlags.getBooleanValue$(MATERIALIZE_FEATURE_FLAG, false));
  };

  private readonly createClient = (scope: MaterializeScope): ScopedMaterializeClient => {
    const { data, fieldFormats, uiSettings, elasticsearch } = this;
    if (!data || !fieldFormats || !uiSettings || !elasticsearch) {
      throw new Error('The isomer plugin materializes only after it starts.');
    }
    const dataServices = async () => {
      const esClient = elasticsearch.client.asScoped(scope.request).asCurrentUser;
      const [dataViews, aggs] = await Promise.all([
        data.indexPatterns.dataViewsServiceFactory(
          scope.savedObjectsClient,
          esClient,
          scope.request
        ),
        data.search.aggs.asScopedToClient(scope.savedObjectsClient, esClient),
      ]);
      return { dataViews, aggs };
    };
    return createScopedMaterializeClient({
      registry: this.registry,
      scope,
      isEnabled: this.isMaterializeEnabled,
      logger: this.logger.get('materialize'),
      search: data.search.asScoped(scope.request),
      hasField: createHasField(elasticsearch.client.asScoped(scope.request).asCurrentUser),
      getKitServices: () =>
        createKitServices(uiSettings.asScopedToClient(scope.savedObjectsClient), fieldFormats),
      getAggsServices: async () => {
        const [services, searchSource] = await Promise.all([
          dataServices(),
          data.search.searchSource.asScoped(scope.request),
        ]);
        return { ...services, searchSource };
      },
      getSelectionServices: dataServices,
      validate: this.validateNode,
      kibanaVersion: this.kibanaVersion,
      report: this.reportMaterialize,
    });
  };

  private readonly validateNode = createNodeValidator();

  private readonly reportMaterialize = (event: MaterializeEvent) => {
    this.logger.get('instrumentation').debug(() => `Materialized: ${JSON.stringify(event)}`);
    this.reportEvent?.(MATERIALIZE_EVENT.eventType, event);
  };

  private readonly reportRender = (event: RenderEvent) => {
    this.logger.get('instrumentation').debug(() => `Rendered: ${JSON.stringify(event)}`);
    this.reportEvent?.(RENDER_EVENT.eventType, event);
  };

  private readonly getRuntime = (): Promise<KibanaIsomerRuntime> => {
    this.runtime ??= createRuntime().then(
      (runtime) => {
        this.logger.debug('Built the Isomer runtime with the components and charts packs.');
        return instrumentRuntime(runtime, this.reportRender);
      },
      (error) => {
        this.runtime = undefined;
        throw error;
      }
    );
    return this.runtime;
  };
}
