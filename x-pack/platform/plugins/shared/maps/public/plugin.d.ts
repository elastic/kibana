import type { Setup as InspectorSetupContract } from '@kbn/inspector-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { VisualizationsSetup, VisualizationsStart } from '@kbn/visualizations-plugin/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { ContentManagementPublicSetup, ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { MapsSetupApi, MapsStartApi } from './api';
import type { MapsXPackConfig } from '../server/config';
export interface MapsPluginSetupDependencies {
    cloud?: CloudSetup;
    data: DataPublicPluginSetup;
    expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
    inspector: InspectorSetupContract;
    home?: HomePublicPluginSetup;
    lens: LensPublicSetup;
    visualizations: VisualizationsSetup;
    embeddable: EmbeddableSetup;
    share: SharePluginSetup;
    licensing: LicensingPluginSetup;
    usageCollection?: UsageCollectionSetup;
    screenshotMode?: ScreenshotModePluginSetup;
    contentManagement: ContentManagementPublicSetup;
}
export interface MapsPluginStartDependencies {
    charts: ChartsPluginStart;
    cps?: CPSPluginStart;
    data: DataPublicPluginStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    kql: KqlPluginStart;
    embeddable: EmbeddableStart;
    fieldFormats: FieldFormatsStart;
    fileUpload: FileUploadPluginStart;
    inspector: InspectorStartContract;
    licensing: LicensingPluginStart;
    navigation: NavigationPublicPluginStart;
    uiActions: UiActionsStart;
    share: SharePluginStart;
    visualizations: VisualizationsStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    presentationUtil: PresentationUtilPluginStart;
    spaces?: SpacesPluginStart;
    mapsEms: MapsEmsPluginPublicStart;
    contentManagement: ContentManagementPublicStart;
    screenshotMode?: ScreenshotModePluginSetup;
    usageCollection?: UsageCollectionSetup;
    serverless?: ServerlessPluginStart;
}
/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type MapsPluginSetup = ReturnType<MapsPlugin['setup']>;
export type MapsPluginStart = ReturnType<MapsPlugin['start']>;
/** @internal */
export declare class MapsPlugin implements Plugin<MapsPluginSetup, MapsPluginStart, MapsPluginSetupDependencies, MapsPluginStartDependencies> {
    readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;
    constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>);
    setup(core: CoreSetup<MapsPluginStartDependencies, MapsPluginStart>, plugins: MapsPluginSetupDependencies): MapsSetupApi;
    start(core: CoreStart, plugins: MapsPluginStartDependencies): MapsStartApi;
}
