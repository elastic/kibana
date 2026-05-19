import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { DataVisualizerPluginStart } from '../../../../plugin';
import type { FieldStatisticsTableEmbeddableState } from '../grid_embeddable/types';
import type { DataVisualizerStartDependencies } from '../../../common/types/data_visualizer_plugin';
import type { FieldStatisticsTableEmbeddableApi } from './types';
export interface EmbeddableFieldStatsChartStartServices {
    data: DataPublicPluginStart;
}
export declare const getDependencies: (getStartServices: StartServicesAccessor<DataVisualizerStartDependencies, DataVisualizerPluginStart>) => Promise<{
    analytics: import("@kbn/core/public").AnalyticsServiceStart;
    application: import("@kbn/core/public").ApplicationStart;
    chrome: import("@kbn/core/public").ChromeStart;
    customBranding: import("@kbn/core/public").CustomBrandingStart;
    docLinks: import("@kbn/core/public").DocLinksStart;
    executionContext: import("@kbn/core/public").ExecutionContextStart;
    featureFlags: import("@kbn/core/public").FeatureFlagsStart;
    injection: import("@kbn/core/packages/di/common").CoreDiServiceStart;
    i18n: import("@kbn/core/public").I18nStart;
    overlays: import("@kbn/core/public").OverlayStart;
    settings: import("@kbn/core/packages/ui-settings/browser").SettingsStart;
    fatalErrors: import("@kbn/core/public").FatalErrorsStart;
    deprecations: import("@kbn/core/public").DeprecationsServiceStart;
    theme: import("@kbn/core/public").ThemeServiceStart;
    plugins: import("@kbn/core/public").PluginsServiceStart;
    pricing: import("@kbn/core/public").PricingServiceStart;
    security: import("@kbn/core/public").SecurityServiceStart;
    userProfile: import("@kbn/core/public").UserProfileServiceStart;
    rendering: import("@kbn/core/packages/rendering/browser").RenderingService;
    http: import("@kbn/core/public").HttpSetup;
    uiSettings: import("@kbn/core/public").IUiSettingsClient;
    data: DataPublicPluginStart;
    notifications: import("@kbn/core/public").NotificationsStart;
    lens: import("../../../../../../../shared/lens/public").LensPublicStart | undefined;
    usageCollection: import("@kbn/usage-collection-plugin/public").UsageCollectionStart | undefined;
    fieldFormats: import("@kbn/field-formats-plugin/public").FieldFormatsStart;
}>;
export declare const getFieldStatsChartEmbeddableFactory: (getStartServices: StartServicesAccessor<DataVisualizerStartDependencies, DataVisualizerPluginStart>) => EmbeddableFactory<FieldStatisticsTableEmbeddableState, FieldStatisticsTableEmbeddableApi>;
