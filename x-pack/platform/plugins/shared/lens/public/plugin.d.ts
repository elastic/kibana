import type { CoreSetup, CoreStart, DocLinksStart } from '@kbn/core/public';
import type { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import type { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';
import type { GlobalSearchPluginSetup } from '@kbn/global-search-plugin/public';
import type { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiActionsStart, VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { ChartType } from '@kbn/visualization-utils';
import { type VisualizationType, type LensTopNavMenuEntryGenerator, type VisualizeEditorContext } from '@kbn/lens-common';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
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
import type { SaveModalContainerProps } from './app_plugin/save_modal_container';
import type { ChartInfoApi } from './chart_info_api';
import type { EditLensConfigurationProps } from './app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { LensRenderer } from './react_embeddable/renderer/lens_custom_renderer_component';
import type { Visualization, LensSerializedState, TypedLensByValueInput, Suggestion } from '.';
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
    registerVisualization: <T>(visualization: Visualization<T> | (() => Promise<Visualization<T>>)) => void;
    /**
     * Register a generic menu entry shown in the top nav
     * See `x-pack/examples/3rd_party_lens_navigation_prompt` for exemplary usage.
     *
     * This API might undergo breaking changes even in minor versions.
     *
     * @experimental
     */
    registerTopNavMenuEntryGenerator: (navigationPromptGenerator: LensTopNavMenuEntryGenerator) => void;
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
    navigateToPrefilledEditor: (input: LensSerializedState | undefined, options?: {
        openInNewTab?: boolean;
        originatingApp?: string;
        originatingPath?: string;
        skipAppLeave?: boolean;
    }) => void;
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
export type LensSuggestionsApi = (context: VisualizeFieldContext | VisualizeEditorContext, dataViews: DataView, excludedVisualizations?: string[], preferredChartType?: ChartType, preferredVisAttributes?: TypedLensByValueInput['attributes']) => Suggestion[] | undefined;
export declare class LensPlugin {
    private datatableVisualization;
    private editorFrameService;
    private editorFrameSetup;
    private queuedVisualizations;
    private FormBasedDatasource;
    private TextBasedDatasource;
    private xyVisualization;
    private legacyMetricVisualization;
    private metricVisualization;
    private pieVisualization;
    private heatmapVisualization;
    private gaugeVisualization;
    private tagcloudVisualization;
    private topNavMenuEntries;
    private hasDiscoverAccess;
    private dataViewsService;
    private locator?;
    private datasourceMap;
    private visualizationMap;
    private setupPendingTasks;
    private initEditorFrameService;
    setup(core: CoreSetup<LensPluginStartDependencies, void>, { urlForwarding, expressions, data, fieldFormats, embeddable, visualizations, charts, globalSearch, usageCollection, share, contentManagement, }: LensPluginSetupDependencies): {
        registerVisualization: (vis: Visualization | (() => Promise<Visualization>)) => void;
        registerTopNavMenuEntryGenerator: (menuEntryGenerator: LensTopNavMenuEntryGenerator) => void;
    };
    private initParts;
    start(core: CoreStart, startDependencies: LensPluginStartDependencies): LensPublicStart;
    stop(): void;
}
