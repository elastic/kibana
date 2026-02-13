/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, DocLinksStart } from '@kbn/core/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type {
  ExpressionsServiceSetup,
  ExpressionsSetup,
  ExpressionsStart,
} from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import {
  ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
  ACTION_CONVERT_TO_LENS,
  ACTION_CONVERT_AGG_BASED_TO_LENS,
} from '@kbn/visualizations-plugin/public';
import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ACTION_VISUALIZE_FIELD, ACTION_VISUALIZE_LENS_FIELD } from '@kbn/ui-actions-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { AdvancedUiActionsSetup } from '@kbn/ui-actions-enhanced-plugin/public';
import type { SharePluginSetup, ExportShare, SharePluginStart } from '@kbn/share-plugin/public';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { ChartType } from '@kbn/visualization-utils';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type {
  VisualizationType,
  LensAppLocator,
  DatasourceMap,
  VisualizationMap,
  LensTopNavMenuEntryGenerator,
  VisualizeEditorContext,
  EditorFrameSetup,
  LensDocument,
  LensByRefSerializedState,
} from '@kbn/lens-common';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
import type { EventAnnotationPluginStart } from '@kbn/event-annotation-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import {
  LENS_CONTENT_TYPE,
  LENS_ITEM_LATEST_VERSION,
} from '@kbn/lens-common/content_management/constants';
import {
  ADD_CANVAS_ELEMENT_TRIGGER,
  ADD_PANEL_TRIGGER,
  AGG_BASED_VISUALIZATION_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
  IN_APP_EMBEDDABLE_EDIT_TRIGGER,
  VISUALIZE_EDITOR_TRIGGER,
  VISUALIZE_FIELD_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { EditorFrameService as EditorFrameServiceType } from './editor_frame_service';
import type {
  FormBasedDatasource as FormBasedDatasourceType,
  FormBasedDatasourceSetupPlugins,
} from './datasources/form_based';
import type { TextBasedDatasource as TextBasedDatasourceType } from './datasources/text_based';

import type {
  XyVisualization as XyVisualizationType,
  XyVisualizationPluginSetupPlugins,
} from './visualizations/xy';
import type {
  LegacyMetricVisualization as LegacyMetricVisualizationType,
  LegacyMetricVisualizationPluginSetupPlugins,
} from './visualizations/legacy_metric';
import type { MetricVisualization as MetricVisualizationType } from './visualizations/metric';
import type {
  DatatableVisualization as DatatableVisualizationType,
  DatatableVisualizationPluginSetupPlugins,
} from './visualizations/datatable';
import type {
  PieVisualization as PieVisualizationType,
  PieVisualizationPluginSetupPlugins,
} from './visualizations/partition';
import type { HeatmapVisualization as HeatmapVisualizationType } from './visualizations/heatmap';
import type { GaugeVisualization as GaugeVisualizationType } from './visualizations/gauge';
import type { TagcloudVisualization as TagcloudVisualizationType } from './visualizations/tagcloud';

import {
  APP_ID,
  getEditPath,
  LENS_EMBEDDABLE_TYPE,
  LENS_ICON,
  NOT_INTERNATIONALIZED_PRODUCT_NAME,
} from '../common/constants';
import type { FormatFactory } from '../common/types';
import { lensVisTypeAlias } from './vis_type_alias';

import { getSaveModalComponent } from './app_plugin/shared/saved_modal_lazy';
import type { SaveModalContainerProps } from './app_plugin/save_modal_container';

import { setupExpressions } from './expressions';
import { OpenInDiscoverDrilldown } from './trigger_actions/open_in_discover_drilldown';
import type { ChartInfoApi } from './chart_info_api';
import { LensAppLocatorDefinition } from '../common/locator/locator';

import type { LensAttributes } from '../server/content_management';
import type { EditLensConfigurationProps } from './app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { LensRenderer } from './react_embeddable/renderer/lens_custom_renderer_component';
import {
  ACTION_CREATE_ESQL_CHART,
  ACTION_EDIT_LENS_EMBEDDABLE,
} from './trigger_actions/open_lens_config/constants';
import { downloadCsvLensShareProvider } from './app_plugin/csv_download_provider/csv_download_provider';
import { setLensFeatureFlags } from './get_feature_flags';
import type { Visualization, LensSerializedState, TypedLensByValueInput, Suggestion } from '.';
import type { LensEmbeddableStartServices } from './react_embeddable/types';
import type { EditorFrameServiceValue } from './editor_frame_service/editor_frame_service_context';
import { setLensBuilder } from './lazy_builder';

export type { SaveProps } from './app_plugin';

export interface LensPluginSetupDependencies {
  urlForwarding: UrlForwardingSetup;
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  fieldFormats: FieldFormatsSetup;
  embeddable?: EmbeddableSetup;
  visualizations: VisualizationsSetup;
  charts: ChartsPluginSetup;
  globalSearch?: GlobalSearchPluginSetup;
  usageCollection?: UsageCollectionSetup;
  uiActionsEnhanced: AdvancedUiActionsSetup;
  share?: SharePluginSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface LensPluginStartDependencies {
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  kql: KqlPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  expressions: ExpressionsStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  visualizations: VisualizationsStart;
  embeddable: EmbeddableStart;
  charts: ChartsPluginStart;
  eventAnnotation: EventAnnotationPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
  inspector: InspectorStartContract;
  spaces?: SpacesPluginStart;
  usageCollection?: UsageCollectionStart;
  docLinks: DocLinksStart;
  share?: SharePluginStart;
  eventAnnotationService: EventAnnotationServiceType;
  contentManagement: ContentManagementPublicStart;
  serverless?: ServerlessPluginStart;
  licensing?: LicensingPluginStart;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
  fieldsMetadata?: FieldsMetadataPublicStart;
  cps?: CPSPluginStart;
}

export interface LensPublicSetup {
  /**
   * Register 3rd party visualization type
   * See `x-pack/examples/3rd_party_lens_vis` for exemplary usage.
   *
   * In case the visualization is a function returning a promise, it will only be called once Lens is actually requiring it.
   * This can be used to lazy-load parts of the code to keep the initial bundle as small as possible.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  registerVisualization: <T>(
    visualization: Visualization<T> | (() => Promise<Visualization<T>>)
  ) => void;
  /**
   * Register a generic menu entry shown in the top nav
   * See `x-pack/examples/3rd_party_lens_navigation_prompt` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  registerTopNavMenuEntryGenerator: (
    navigationPromptGenerator: LensTopNavMenuEntryGenerator
  ) => void;
}

export interface LensPublicStart {
  /**
   * React component which can be used to embed a Lens visualization into another application.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  EmbeddableComponent: typeof LensRenderer;
  /**
   * React component which can be used to embed a Lens Visualization Save Modal Component.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  SaveModalComponent: React.ComponentType<Omit<SaveModalContainerProps, 'lensServices'>>;
  /**
   * React component which can be used to embed a Lens Visualization Config Panel Component.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  EditLensConfigPanelApi: () => Promise<EditLensConfigPanelComponent>;
  /**
   * Method which navigates to the Lens editor, loading the state specified by the `input` parameter.
   * See `x-pack/examples/embedded_lens_example` for exemplary usage.
   *
   * This API might undergo breaking changes even in minor versions.
   *
   * @experimental
   */
  navigateToPrefilledEditor: (
    input: LensSerializedState | undefined,
    options?: {
      openInNewTab?: boolean;
      originatingApp?: string;
      originatingPath?: string;
      skipAppLeave?: boolean;
    }
  ) => void;
  /**
   * Method which returns true if the user has permission to use Lens as defined by application capabilities.
   */
  canUseEditor: () => boolean;

  /**
   * Method which returns xy VisualizationTypes array keeping this async as to not impact page load bundle
   */
  getXyVisTypes: () => Promise<VisualizationType[]>;

  /**
   * API which returns state helpers keeping this async as to not impact page load bundle
   */
  stateHelperApi: () => Promise<{
    chartInfo: ChartInfoApi;
    suggestions: LensSuggestionsApi;
  }>;
}

export type EditLensConfigPanelComponent = React.ComponentType<EditLensConfigurationProps>;

export type LensSuggestionsApi = (
  context: VisualizeFieldContext | VisualizeEditorContext,
  dataViews: DataView,
  excludedVisualizations?: string[],
  preferredChartType?: ChartType,
  preferredVisAttributes?: TypedLensByValueInput['attributes']
) => Suggestion[] | undefined;

export class LensPlugin {
  private datatableVisualization: DatatableVisualizationType | undefined;
  private editorFrameService: EditorFrameServiceType | undefined;
  private editorFrameSetup: EditorFrameSetup | undefined;
  private queuedVisualizations: Array<Visualization | (() => Promise<Visualization>)> = [];
  private FormBasedDatasource: FormBasedDatasourceType | undefined;
  private TextBasedDatasource: TextBasedDatasourceType | undefined;
  private xyVisualization: XyVisualizationType | undefined;
  private legacyMetricVisualization: LegacyMetricVisualizationType | undefined;
  private metricVisualization: MetricVisualizationType | undefined;
  private pieVisualization: PieVisualizationType | undefined;
  private heatmapVisualization: HeatmapVisualizationType | undefined;
  private gaugeVisualization: GaugeVisualizationType | undefined;
  private tagcloudVisualization: TagcloudVisualizationType | undefined;
  private topNavMenuEntries: LensTopNavMenuEntryGenerator[] = [];
  private hasDiscoverAccess: boolean = false;
  private dataViewsService: DataViewsPublicPluginStart | undefined;
  private locator?: LensAppLocator;
  private datasourceMap: DatasourceMap | undefined;
  private visualizationMap: VisualizationMap | undefined;

  private setupPendingTasks: Array<Promise<unknown>> = [];

  // Note: this method will be overwritten in the setup flow
  private initEditorFrameService = async (): Promise<EditorFrameServiceValue> => ({
    datasourceMap: {},
    visualizationMap: {},
  });

  setup(
    core: CoreSetup<LensPluginStartDependencies, void>,
    {
      urlForwarding,
      expressions,
      data,
      fieldFormats,
      embeddable,
      visualizations,
      charts,
      globalSearch,
      usageCollection,
      uiActionsEnhanced,
      share,
      contentManagement,
    }: LensPluginSetupDependencies
  ) {
    const startServices = createStartServicesGetter(core.getStartServices);

    const getStartServicesForEmbeddable = async (): Promise<LensEmbeddableStartServices> => {
      const { core: coreStart, plugins } = startServices();

      const [
        { getLensAttributeService, setUsageCollectionStart, initMemoizedErrorNotification },
        { visualizationMap, datasourceMap },
        eventAnnotationService,
      ] = await Promise.all([
        import('./async_services'),
        this.initEditorFrameService(),
        plugins.eventAnnotation.getService(),
      ]);

      if (plugins.usageCollection) {
        setUsageCollectionStart(plugins.usageCollection);
      }

      initMemoizedErrorNotification(coreStart);

      return {
        ...plugins,
        attributeService: getLensAttributeService(coreStart.http),
        capabilities: coreStart.application.capabilities,
        coreHttp: coreStart.http,
        coreStart,
        timefilter: plugins.data.query.timefilter.timefilter,
        expressionRenderer: plugins.expressions.ReactExpressionRenderer,
        documentToExpression: (doc: LensDocument, forceDSL?: boolean) =>
          this.editorFrameService!.documentToExpression(doc, {
            dataViews: plugins.dataViews,
            storage: new Storage(localStorage),
            uiSettings: core.uiSettings,
            timefilter: plugins.data.query.timefilter.timefilter,
            nowProvider: plugins.data.nowProvider,
            forceDSL,
            eventAnnotationService,
          }),
        injectFilterReferences: data.query.filterManager.inject.bind(data.query.filterManager),
        visualizationMap,
        datasourceMap,
        theme: core.theme,
        uiSettings: core.uiSettings,
      };
    };

    if (embeddable) {
      // Let Kibana know about the Lens embeddable
      embeddable.registerReactEmbeddableFactory(LENS_EMBEDDABLE_TYPE, async () => {
        const [deps, { createLensEmbeddableFactory }] = await Promise.all([
          getStartServicesForEmbeddable(),
          import('./async_services'),
        ]);
        return createLensEmbeddableFactory(deps);
      });

      this.setupPendingTasks.push(
        core.getStartServices().then(async ([{ featureFlags }]) => {
          // This loads the feature flags async to allow synchronous access to flags via getLensFeatureFlags
          const flags = await setLensFeatureFlags(featureFlags);

          // This loads the builder async to allow synchronous access to builder via getLensBuilder
          await setLensBuilder(flags.apiFormat);

          embeddable.registerLegacyURLTransform(
            LENS_EMBEDDABLE_TYPE,
            async (transformDrilldownsOut: DrilldownTransforms['transformOut']) => {
              const { getTransformOut } = await import('./async_services');
              const { LensConfigBuilder } = await import('@kbn/lens-embeddable-utils');
              const builder = new LensConfigBuilder(undefined, flags.apiFormat);

              return getTransformOut(builder, transformDrilldownsOut);
            }
          );
        })
      );

      // Let Dashboard know about the Lens panel type
      embeddable.registerAddFromLibraryType<LensAttributes>({
        onAdd: (container, savedObject) => {
          container.addNewPanel(
            {
              panelType: LENS_EMBEDDABLE_TYPE,
              serializedState: {
                savedObjectId: savedObject.id,
              } satisfies LensByRefSerializedState,
            },
            {
              displaySuccessMessage: true,
            }
          );
        },
        savedObjectType: LENS_EMBEDDABLE_TYPE,
        savedObjectName: i18n.translate('xpack.lens.mapSavedObjectLabel', {
          defaultMessage: 'Lens',
        }),
        getIconForSavedObject: () => LENS_ICON,
      });
    }

    if (share) {
      this.locator = share.url.locators.create(new LensAppLocatorDefinition());

      share.registerShareIntegration<ExportShare>(
        'lens',
        downloadCsvLensShareProvider({
          uiSettings: core.uiSettings,
          formatFactoryFn: () => startServices().plugins.fieldFormats.deserialize,
          atLeastGold: () => {
            let isGold = false;
            startServices()
              .plugins.licensing?.license$.pipe()
              .subscribe((license) => {
                isGold = license.hasAtLeast('gold');
              });
            return isGold;
          },
        })
      );
    }

    visualizations.registerAlias(lensVisTypeAlias);

    uiActionsEnhanced.registerDrilldown(
      new OpenInDiscoverDrilldown({
        dataViews: () => this.dataViewsService!,
        locator: () => share?.url.locators.get('DISCOVER_APP_LOCATOR'),
        hasDiscoverAccess: () => this.hasDiscoverAccess,
        application: () => startServices().core.application,
      })
    );

    contentManagement.registry.register({
      id: LENS_CONTENT_TYPE,
      version: {
        latest: LENS_ITEM_LATEST_VERSION,
      },
      name: i18n.translate('xpack.lens.content.name', {
        defaultMessage: 'Lens Visualization',
      }),
    });

    setupExpressions(
      expressions,
      () => startServices().plugins.fieldFormats.deserialize,
      () => startServices().plugins.data.datatableUtilities,
      async () => {
        const { getTimeZone } = await import('./async_services');
        return getTimeZone(core.uiSettings);
      },
      () => startServices().plugins.data.nowProvider.get()
    );

    core.application.register({
      id: APP_ID,
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      visibleIn: ['globalSearch'],
      category: DEFAULT_APP_CATEGORIES.kibana,
      euiIconType: 'logoKibana',
      mount: async (params: AppMountParameters) => {
        const { core: coreStart, plugins: deps } = startServices();

        const [
          {
            mountApp,
            getLensAttributeService,
            setUsageCollectionStart,
            initMemoizedErrorNotification,
          },
        ] = await Promise.all([
          import('./async_services'),
          this.initParts(
            core,
            data,
            charts,
            expressions,
            fieldFormats,
            deps.fieldFormats.deserialize
          ),
          ...this.setupPendingTasks,
        ]);

        if (deps.usageCollection) {
          setUsageCollectionStart(deps.usageCollection);
        }
        initMemoizedErrorNotification(coreStart);

        const frameStart = this.editorFrameService!.start(coreStart, deps);

        return mountApp(core, params, {
          createEditorFrame: frameStart.createInstance,
          attributeService: getLensAttributeService(coreStart.http),
          topNavMenuEntryGenerators: this.topNavMenuEntries,
          locator: this.locator,
        });
      },
    });

    urlForwarding.forwardApp(APP_ID, APP_ID);

    // Note: this overwrites a method defined above
    this.initEditorFrameService = async () => {
      if (this.datasourceMap && this.visualizationMap) {
        return { datasourceMap: this.datasourceMap, visualizationMap: this.visualizationMap };
      }
      const { plugins } = startServices();
      await this.initParts(
        core,
        data,
        charts,
        expressions,
        fieldFormats,
        plugins.fieldFormats.deserialize
      );
      // This needs to be executed before the import call to avoid race conditions
      const [visualizationMap, datasourceMap] = await Promise.all([
        this.editorFrameService!.loadVisualizations(),
        this.editorFrameService!.loadDatasources(),
      ]);
      this.visualizationMap = visualizationMap;
      this.datasourceMap = datasourceMap;
      return { datasourceMap, visualizationMap };
    };

    return {
      registerVisualization: (vis: Visualization | (() => Promise<Visualization>)) => {
        if (this.editorFrameSetup) {
          this.editorFrameSetup.registerVisualization(vis);
        } else {
          // queue visualizations if editor frame is not yet ready as it's loaded async
          this.queuedVisualizations.push(vis);
        }
      },
      registerTopNavMenuEntryGenerator: (menuEntryGenerator: LensTopNavMenuEntryGenerator) => {
        this.topNavMenuEntries.push(menuEntryGenerator);
      },
    };
  }

  private async initParts(
    core: CoreSetup<LensPluginStartDependencies, void>,
    data: DataPublicPluginSetup,
    charts: ChartsPluginSetup,
    expressions: ExpressionsServiceSetup,
    fieldFormats: FieldFormatsSetup,
    formatFactory: FormatFactory
  ) {
    const {
      DatatableVisualization,
      EditorFrameService,
      FormBasedDatasource,
      XyVisualization,
      LegacyMetricVisualization,
      MetricVisualization,
      PieVisualization,
      HeatmapVisualization,
      GaugeVisualization,
      TagcloudVisualization,
      TextBasedDatasource,
    } = await import('./async_services');
    this.datatableVisualization = new DatatableVisualization();
    this.editorFrameService = new EditorFrameService();
    this.FormBasedDatasource = new FormBasedDatasource();
    this.TextBasedDatasource = new TextBasedDatasource();
    this.xyVisualization = new XyVisualization();
    this.legacyMetricVisualization = new LegacyMetricVisualization();
    this.metricVisualization = new MetricVisualization();
    this.pieVisualization = new PieVisualization();
    this.heatmapVisualization = new HeatmapVisualization();
    this.gaugeVisualization = new GaugeVisualization();
    this.tagcloudVisualization = new TagcloudVisualization();

    const editorFrameSetupInterface = this.editorFrameService.setup();

    const dependencies: FormBasedDatasourceSetupPlugins &
      XyVisualizationPluginSetupPlugins &
      DatatableVisualizationPluginSetupPlugins &
      LegacyMetricVisualizationPluginSetupPlugins &
      PieVisualizationPluginSetupPlugins = {
      expressions,
      data,
      fieldFormats,
      charts,
      editorFrame: editorFrameSetupInterface,
      formatFactory,
    };
    this.FormBasedDatasource.setup(core, dependencies);
    this.TextBasedDatasource.setup(core, dependencies);
    this.xyVisualization.setup(core, dependencies);
    this.datatableVisualization.setup(core, dependencies);
    this.legacyMetricVisualization.setup(core, dependencies);
    this.metricVisualization.setup(core, dependencies);
    this.pieVisualization.setup(core, dependencies);
    this.heatmapVisualization.setup(core, dependencies);
    this.gaugeVisualization.setup(core, dependencies);
    this.tagcloudVisualization.setup(core, dependencies);

    this.queuedVisualizations.forEach((queuedVis) => {
      editorFrameSetupInterface.registerVisualization(queuedVis);
    });
    this.editorFrameSetup = editorFrameSetupInterface;
  }

  start(core: CoreStart, startDependencies: LensPluginStartDependencies): LensPublicStart {
    this.hasDiscoverAccess = core.application.capabilities.discover_v2.show as boolean;
    this.dataViewsService = startDependencies.dataViews;
    // unregisters the Visualize action and registers the lens one
    if (startDependencies.uiActions.hasAction(ACTION_VISUALIZE_FIELD)) {
      startDependencies.uiActions.unregisterAction(ACTION_VISUALIZE_FIELD);
    }

    startDependencies.uiActions.addTriggerActionAsync(
      VISUALIZE_FIELD_TRIGGER,
      ACTION_VISUALIZE_LENS_FIELD,
      async () => {
        const { visualizeFieldAction } = await import('./async_services');
        return visualizeFieldAction(core.application);
      }
    );

    startDependencies.uiActions.addTriggerActionAsync(
      VISUALIZE_EDITOR_TRIGGER,
      ACTION_CONVERT_TO_LENS,
      async () => {
        const { visualizeTSVBAction } = await import('./async_services');
        return visualizeTSVBAction(core.application);
      }
    );

    startDependencies.uiActions.addTriggerActionAsync(
      DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
      ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
      async () => {
        const { convertToLensActionFactory } = await import('./async_services');
        const action = convertToLensActionFactory(
          ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
          i18n.translate('xpack.lens.visualizeLegacyVisualizationChart', {
            defaultMessage: 'Visualize legacy visualization chart',
          }),
          i18n.translate('xpack.lens.dashboardLabel', {
            defaultMessage: 'Dashboard',
          })
        );
        return action(core.application);
      }
    );

    startDependencies.uiActions.addTriggerActionAsync(
      AGG_BASED_VISUALIZATION_TRIGGER,
      ACTION_CONVERT_AGG_BASED_TO_LENS,
      async () => {
        const { convertToLensActionFactory } = await import('./async_services');
        const action = convertToLensActionFactory(
          ACTION_CONVERT_AGG_BASED_TO_LENS,
          i18n.translate('xpack.lens.visualizeAggBasedLegend', {
            defaultMessage: 'Visualize agg based chart',
          }),
          i18n.translate('xpack.lens.AggBasedLabel', {
            defaultMessage: 'aggregation based visualization',
          })
        );
        return action(core.application);
      }
    );

    // Allows the Lens embeddable to easily open the inline editing flyout
    startDependencies.uiActions.addTriggerActionAsync(
      IN_APP_EMBEDDABLE_EDIT_TRIGGER,
      ACTION_EDIT_LENS_EMBEDDABLE,
      async () => {
        const { EditLensEmbeddableAction } = await import('./async_services');
        const { visualizationMap, datasourceMap } = await this.initEditorFrameService();
        return new EditLensEmbeddableAction(core, {
          ...startDependencies,
          visualizationMap,
          datasourceMap,
        });
      }
    );

    startDependencies.uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ACTION_CREATE_ESQL_CHART,
      async () => {
        const { AddESQLPanelAction } = await import('./async_services');
        return new AddESQLPanelAction(core);
      }
    );
    startDependencies.uiActions.registerActionAsync('addLensPanelAction', async () => {
      const { getAddLensPanelAction } = await import('./async_services');
      return getAddLensPanelAction(startDependencies);
    });
    startDependencies.uiActions.attachAction(ADD_PANEL_TRIGGER, 'addLensPanelAction');

    startDependencies.uiActions.attachAction(ADD_CANVAS_ELEMENT_TRIGGER, 'addLensPanelAction');

    const discoverLocator = startDependencies.share?.url.locators.get('DISCOVER_APP_LOCATOR');
    if (discoverLocator) {
      startDependencies.uiActions.addTriggerActionAsync(
        CONTEXT_MENU_TRIGGER,
        'ACTION_OPEN_IN_DISCOVER',
        async () => {
          const { createOpenInDiscoverAction } = await import(
            './trigger_actions/open_in_discover_action'
          );
          return createOpenInDiscoverAction(
            discoverLocator,
            startDependencies.dataViews,
            this.hasDiscoverAccess
          );
        }
      );
    }

    return {
      EmbeddableComponent: LensRenderer,
      SaveModalComponent: getSaveModalComponent(core, startDependencies),
      navigateToPrefilledEditor: (
        input,
        { openInNewTab = false, originatingApp = '', originatingPath, skipAppLeave = false } = {}
      ) => {
        // for openInNewTab, we set the time range in url via getEditPath below
        if (input?.timeRange && !openInNewTab) {
          startDependencies.data.query.timefilter.timefilter.setTime(input.timeRange);
        }
        const transfer = new EmbeddableStateTransfer(
          core.application.navigateToApp,
          core.application.currentAppId$
        );
        transfer.navigateToEditor(APP_ID, {
          openInNewTab,
          path: getEditPath(undefined, (openInNewTab && input?.timeRange) || undefined),
          state: {
            originatingApp,
            originatingPath,
            valueInput: input,
          },
          skipAppLeave,
        });
      },
      canUseEditor: () => {
        return Boolean(core.application.capabilities.visualize_v2?.show);
      },
      getXyVisTypes: async () => {
        const { visualizationSubtypes } = await import('./async_services');
        return visualizationSubtypes;
      },

      stateHelperApi: async () => {
        const [{ createChartInfoApi, suggestionsApi }, { visualizationMap, datasourceMap }] =
          await Promise.all([import('./async_services'), this.initEditorFrameService()]);

        return {
          chartInfo: createChartInfoApi(
            startDependencies.dataViews,
            visualizationMap,
            datasourceMap
          ),
          suggestions: (
            context,
            dataView,
            excludedVisualizations,
            preferredChartType,
            preferredVisAttributes
          ) => {
            return suggestionsApi({
              datasourceMap,
              visualizationMap,
              context,
              dataView,
              excludedVisualizations,
              preferredChartType,
              preferredVisAttributes,
            });
          },
        };
      },
      // TODO: remove this in faviour of the custom action thing
      // This is currently used in Discover by the unified histogram plugin
      EditLensConfigPanelApi: async () => {
        const [{ visualizationMap, datasourceMap }, { getEditLensConfiguration }] =
          await Promise.all([this.initEditorFrameService(), import('./async_services')]);
        const Component = await getEditLensConfiguration(
          core,
          startDependencies,
          visualizationMap,
          datasourceMap
        );
        return Component;
      },
    };
  }

  stop() {}
}
