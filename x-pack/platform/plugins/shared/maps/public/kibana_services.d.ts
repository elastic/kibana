import type { CoreStart } from '@kbn/core/public';
import type { EMSSettings } from '@kbn/maps-ems-plugin/common/ems_settings';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { MapsConfigType } from '../server/config';
import type { MapsPluginStartDependencies } from './plugin';
export declare const untilPluginStartServicesReady: () => Promise<void>;
export declare function setStartServices(core: CoreStart, plugins: MapsPluginStartDependencies): void;
export declare function setIsCloudEnabled(enabled: boolean): void;
export declare const getIsCloud: () => boolean;
export declare const getSpaceId: () => string;
export declare const setSpaceId: (_spaceId: string) => void;
export declare const getIndexNameFormComponent: () => typeof import("../../../private/file_upload/public/api/index_name_form_async_wrapper").IndexNameFormAsyncWrapper;
export declare const getFileUploadComponent: () => typeof import("../../../private/file_upload/public/api/geo_upload_wizard_async_wrapper").GeoUploadWizardAsyncWrapper;
export declare const getIndexPatternService: () => import("@kbn/data-views-plugin/public/types").DataViewsServicePublic;
export declare const getAutocompleteService: () => {
    getQuerySuggestions: import("@kbn/kql/public").QuerySuggestionGetFn;
    hasQuerySuggestions: (language: string) => boolean;
    getValueSuggestions: import("@kbn/kql/public/autocomplete/providers/value_suggestion_provider").ValueSuggestionsGetFn;
};
export declare const getInspector: () => import("@kbn/inspector-plugin/public").Start;
export declare const getFileUpload: () => import("../../../private/file_upload/public/api").FileUploadPluginStartApi;
export declare const getUiSettings: () => import("@kbn/core/public").IUiSettingsClient;
export declare const getIsDarkMode: () => boolean;
export declare const getIndexPatternSelectComponent: () => import("react").ComponentType<import("@kbn/unified-search-plugin/public").IndexPatternSelectProps>;
export declare const getSearchBar: () => (props: import("@kbn/unified-search-plugin/public").StatefulSearchBarProps<import("@kbn/es-query").Query>) => React.ReactElement;
export declare const getHttp: () => import("@kbn/core/public").HttpSetup;
export declare const getExecutionContextService: () => import("@kbn/core/public").ExecutionContextSetup;
export declare const getTimeFilter: () => import("@kbn/data-plugin/public").TimefilterContract;
export declare const getToasts: () => import("@kbn/core/public").IToasts;
export declare const getCoreChrome: () => import("@kbn/core/public").ChromeStart;
export declare const getDevToolsCapabilities: () => Readonly<{
    [x: string]: boolean | Readonly<{
        [x: string]: boolean;
    }>;
}>;
export declare const getMapsCapabilities: () => Readonly<{
    [x: string]: boolean | Readonly<{
        [x: string]: boolean;
    }>;
}>;
export declare const getVisualizeCapabilities: () => Readonly<{
    [x: string]: boolean | Readonly<{
        [x: string]: boolean;
    }>;
}>;
export declare const getDocLinks: () => import("@kbn/core/public").DocLinksStart;
export declare const getCoreOverlays: () => import("@kbn/core/public").OverlayStart;
export declare const getCharts: () => import("@kbn/charts-plugin/public").ChartsPluginStart;
export declare const getData: () => import("@kbn/data-plugin/public").DataPublicPluginStart;
export declare const getUiActions: () => import("@kbn/ui-actions-plugin/public").UiActionsStart;
export declare const getCore: () => CoreStart;
export declare const getNavigation: () => import("@kbn/navigation-plugin/public").NavigationPublicPluginStart;
export declare const getCoreI18n: () => import("@kbn/core/public").I18nStart;
export declare const getAnalytics: () => import("@kbn/core/public").AnalyticsServiceStart;
export declare const getSearchService: () => import("@kbn/data-plugin/public").ISearchStart;
export declare const getEmbeddableService: () => import("@kbn/embeddable-plugin/public").EmbeddableStart;
export declare const getNavigateToApp: () => (appId: string, options?: import("@kbn/core/public").NavigateToAppOptions) => Promise<void>;
export declare const getUrlForApp: () => (appId: string, options?: {
    path?: string;
    absolute?: boolean;
    deepLinkId?: string;
}) => string;
export declare const getNavigateToUrl: () => (url: string, options?: import("@kbn/core/public").NavigateToUrlOptions) => Promise<void>;
export declare const getSavedObjectsTagging: () => import("@kbn/saved-objects-tagging-oss-plugin/public").SavedObjectsTaggingApi | undefined;
export declare const getSpacesApi: () => import("../../spaces/public").SpacesApi | undefined;
export declare const getTheme: () => import("@kbn/core/public").ThemeServiceSetup;
export declare const getApplication: () => import("@kbn/core/public").ApplicationStart;
export declare const getUsageCollection: () => import("@kbn/usage-collection-plugin/public").UsageCollectionSetup | undefined;
export declare const getContentManagement: () => import("@kbn/content-management-plugin/public").ContentManagementPublicStart;
export declare const isScreenshotMode: () => boolean;
export declare const getServerless: () => import("@kbn/serverless/public").ServerlessPluginStart | undefined;
export declare const setMapAppConfig: (config: MapsConfigType) => MapsConfigType;
export declare const getMapAppConfig: () => MapsConfigType;
export declare const getShowMapsInspectorAdapter: () => boolean;
export declare const getPreserveDrawingBuffer: () => boolean;
export declare const getMapsEmsStart: () => MapsEmsPluginPublicStart;
export declare const getEMSSettings: () => EMSSettings;
export declare const getEmsTileLayerId: () => Readonly<{} & {
    dark: string;
    bright: string;
    desaturated: string;
}>;
export declare const getShareService: () => import("@kbn/share-plugin/public").SharePluginStart;
export declare const getCps: () => import("@kbn/cps/public").CPSPluginStart | undefined;
