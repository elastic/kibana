/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart } from '@kbn/core/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  UsageCollectionSetup,
  UsageCollectionStart,
} from '@kbn/usage-collection-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  ExpressionsServiceSetup,
  ExpressionsSetup,
  ExpressionsStart,
} from '@kbn/expressions-plugin/public';
import {
  ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
  DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
  VisualizationsSetup,
  VisualizationsStart,
} from '@kbn/visualizations-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type {
  EventAnnotationPluginStart,
  EventAnnotationServiceType,
} from '@kbn/event-annotation-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import {
  UiActionsStart,
  ACTION_VISUALIZE_FIELD,
  VISUALIZE_FIELD_TRIGGER,
  VisualizeFieldContext,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/public';
import {
  VISUALIZE_EDITOR_TRIGGER,
  AGG_BASED_VISUALIZATION_TRIGGER,
} from '@kbn/visualizations-plugin/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { AdvancedUiActionsSetup } from '@kbn/ui-actions-enhanced-plugin/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { ChartType } from '@kbn/visualization-utils';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { EditorFrameService as EditorFrameServiceType } from './editor_frame_service';
import type {
  FormBasedDatasource as FormBasedDatasourceType,
  FormBasedDatasourceSetupPlugins,
  FormulaPublicApi,
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
import type {
  Visualization,
  VisualizationType,
  EditorFrameSetup,
  LensTopNavMenuEntryGenerator,
  VisualizeEditorContext,
  Suggestion,
  DatasourceMap,
  VisualizationMap,
} from './types';
import { lensVisTypeAlias } from './vis_type_alias';
import { createOpenInDiscoverAction } from './trigger_actions/open_in_discover_action';
import {
  inAppEmbeddableEditTrigger,
  IN_APP_EMBEDDABLE_EDIT_TRIGGER,
} from './trigger_actions/open_lens_config/in_app_embeddable_edit/in_app_embeddable_edit_trigger';
import { EditLensEmbeddableAction } from './trigger_actions/open_lens_config/in_app_embeddable_edit/in_app_embeddable_edit_action';
import { visualizeFieldAction } from './trigger_actions/visualize_field_actions';
import { visualizeTSVBAction } from './trigger_actions/visualize_tsvb_actions';

import type {
  LensEmbeddableStartServices,
  LensSerializedState,
  TypedLensByValueInput,
} from './react_embeddable/types';
import { getSaveModalComponent } from './app_plugin/shared/saved_modal_lazy';
import type { SaveModalContainerProps } from './app_plugin/save_modal_container';

import { setupExpressions } from './expressions';
import { getSearchProvider } from './search_provider';
import { OpenInDiscoverDrilldown } from './trigger_actions/open_in_discover_drilldown';
import { ChartInfoApi } from './chart_info_api';
import { type LensAppLocator, LensAppLocatorDefinition } from '../common/locator/locator';
import { downloadCsvShareProvider } from './app_plugin/csv_download_provider/csv_download_provider';
import { LensDocument } from './persistence/saved_object_store';
import {
  CONTENT_ID,
  LATEST_VERSION,
  LensSavedObjectAttributes,
} from '../common/content_management';
import type { EditLensConfigurationProps } from './app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { convertToLensActionFactory } from './trigger_actions/convert_to_lens_action';
import { LensRenderer } from './react_embeddable/renderer/lens_custom_renderer_component';
import { deserializeState } from './react_embeddable/helper';
import { ACTION_CREATE_ESQL_CHART } from './trigger_actions/open_lens_config/constants';

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
    formula: FormulaPublicApi;
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

  // Note: this method will be overwritten in the setup flow
  private initEditorFrameService = async (): Promise<{
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
  }> => ({ datasourceMap: {}, visualizationMap: {} });

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
      const { setUsageCollectionStart, initMemoizedErrorNotification } = await import(
        './async_services'
      );
      const { core: coreStart, plugins } = startServices();

      const { visualizationMap, datasourceMap } = await this.initEditorFrameService();
      const [{ getLensAttributeService }, eventAnnotationService] = await Promise.all([
        import('./async_services'),
        plugins.eventAnnotation.getService(),
      ]);

      if (plugins.usageCollection) {
        setUsageCollectionStart(plugins.usageCollection);
      }

      initMemoizedErrorNotification(coreStart);

      return {
        ...plugins,
        attributeService: getLensAttributeService(coreStart, plugins),
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
          import('./react_embeddable/lens_embeddable'),
        ]);
        return createLensEmbeddableFactory(deps);
      });

      // Let Dashboard know about the Lens panel type
      embeddable.registerAddFromLibraryType<LensSavedObjectAttributes>({
        onAdd: async (container, savedObject) => {
          const { attributeService } = await getStartServicesForEmbeddable();
          // deserialize the saved object from visualize library
          // this make sure to fit into the new embeddable model, where the following build()
          // function expects a fully loaded runtime state
          const state = await deserializeState(
            attributeService,
            { savedObjectId: savedObject.id },
            savedObject.references
          );
          container.addNewPanel({
            panelType: LENS_EMBEDDABLE_TYPE,
            initialState: state,
          });
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

      share.register(
        downloadCsvShareProvider({
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
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
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
        const { getTimeZone } = await import('./utils');
        return getTimeZone(core.uiSettings);
      },
      () => startServices().plugins.data.nowProvider.get()
    );

    core.application.register({
      id: APP_ID,
      title: NOT_INTERNATIONALIZED_PRODUCT_NAME,
      visibleIn: [],
      mount: async (params: AppMountParameters) => {
        const { core: coreStart, plugins: deps } = startServices();

        await this.initParts(
          core,
          data,
          charts,
          expressions,
          fieldFormats,
          deps.fieldFormats.deserialize
        );

        const {
          mountApp,
          getLensAttributeService,
          setUsageCollectionStart,
          initMemoizedErrorNotification,
        } = await import('./async_services');

        if (deps.usageCollection) {
          setUsageCollectionStart(deps.usageCollection);
        }
        initMemoizedErrorNotification(coreStart);

        const frameStart = this.editorFrameService!.start(coreStart, deps);
        return mountApp(core, params, {
          createEditorFrame: frameStart.createInstance,
          attributeService: getLensAttributeService(coreStart, deps),
          topNavMenuEntryGenerators: this.topNavMenuEntries,
          locator: this.locator,
        });
      },
    });

    if (globalSearch) {
      globalSearch.registerResultProvider(
        getSearchProvider(
          core.getStartServices().then(
            ([
              {
                application: { capabilities },
              },
            ]) => capabilities
          )
        )
      );
    }

    urlForwarding.forwardApp(APP_ID, APP_ID);

    // Note: this overwrites a method defined above
    this.initEditorFrameService = async () => {
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
      const { setVisualizationMap, setDatasourceMap } = await import('./async_services');
      setDatasourceMap(datasourceMap);
      setVisualizationMap(visualizationMap);
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

    // this trigger enables external consumers to use the inline editing flyout
    startDependencies.uiActions.registerTrigger(inAppEmbeddableEditTrigger);

    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_FIELD_TRIGGER,
      visualizeFieldAction(core.application)
    );

    startDependencies.uiActions.addTriggerAction(
      VISUALIZE_EDITOR_TRIGGER,
      visualizeTSVBAction(core.application)
    );

    startDependencies.uiActions.addTriggerAction(
      DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
      convertToLensActionFactory(
        ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
        i18n.translate('xpack.lens.visualizeLegacyVisualizationChart', {
          defaultMessage: 'Visualize legacy visualization chart',
        }),
        i18n.translate('xpack.lens.dashboardLabel', {
          defaultMessage: 'Dashboard',
        })
      )(core.application)
    );

    startDependencies.uiActions.addTriggerAction(
      AGG_BASED_VISUALIZATION_TRIGGER,
      convertToLensActionFactory(
        ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
        i18n.translate('xpack.lens.visualizeAggBasedLegend', {
          defaultMessage: 'Visualize agg based chart',
        }),
        i18n.translate('xpack.lens.AggBasedLabel', {
          defaultMessage: 'aggregation based visualization',
        })
      )(core.application)
    );

    // Allows the Lens embeddable to easily open the inline editing flyout
    const editLensEmbeddableAction = new EditLensEmbeddableAction(startDependencies, core);
    // embeddable inline edit panel action
    startDependencies.uiActions.addTriggerAction(
      IN_APP_EMBEDDABLE_EDIT_TRIGGER,
      editLensEmbeddableAction
    );

    startDependencies.uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ACTION_CREATE_ESQL_CHART,
      async () => {
        const { AddESQLPanelAction } = await import('./async_services');
        return new AddESQLPanelAction(startDependencies, core, async () => {
          if (!this.editorFrameService) {
            await this.initEditorFrameService();
          }

          return this.editorFrameService!;
        });
      }
    );
    startDependencies.uiActions.registerActionAsync('addLensPanelAction', async () => {
      const { getAddLensPanelAction } = await import('./async_services');
      return getAddLensPanelAction(startDependencies);
    });
    startDependencies.uiActions.attachAction(ADD_PANEL_TRIGGER, 'addLensPanelAction');
    if (startDependencies.uiActions.hasTrigger('ADD_CANVAS_ELEMENT_TRIGGER')) {
      // Because Canvas is not enabled in Serverless, this trigger might not be registered - only attach
      // the create action if the Canvas-specific trigger does indeed exist.
      startDependencies.uiActions.attachAction('ADD_CANVAS_ELEMENT_TRIGGER', 'addLensPanelAction');
    }

    const discoverLocator = startDependencies.share?.url.locators.get('DISCOVER_APP_LOCATOR');
    if (discoverLocator) {
      startDependencies.uiActions.addTriggerAction(
        CONTEXT_MENU_TRIGGER,
        createOpenInDiscoverAction(
          discoverLocator,
          startDependencies.dataViews,
          this.hasDiscoverAccess
        )
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
        const { visualizationSubtypes } = await import('./visualizations/xy/types');
        return visualizationSubtypes;
      },

      stateHelperApi: async () => {
        const { createFormulaPublicApi, createChartInfoApi, suggestionsApi } = await import(
          './async_services'
        );

        const { visualizationMap, datasourceMap } = await this.initEditorFrameService();
        return {
          formula: createFormulaPublicApi(),
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
        const { visualizationMap, datasourceMap } = await this.initEditorFrameService();
        const { getEditLensConfiguration } = await import('./async_services');
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
