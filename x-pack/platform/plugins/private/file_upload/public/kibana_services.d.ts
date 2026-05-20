import type { CoreStart } from '@kbn/core/public';
import type { FileUploadPluginStartDependencies } from './plugin';
export declare function setStartServices(core: CoreStart, plugins: FileUploadPluginStartDependencies): void;
export declare const getDocLinks: () => import("@kbn/core/public").DocLinksStart;
export declare const getDataViewsService: () => import("@kbn/data-views-plugin/public/types").DataViewsServicePublic;
export declare const getHttp: () => import("@kbn/core/public").HttpSetup;
export declare const getUiSettings: () => import("@kbn/core/public").IUiSettingsClient;
export declare const getSettings: () => import("@kbn/core/packages/ui-settings/browser").SettingsStart;
export declare const getTheme: () => import("@kbn/core/public").ThemeServiceSetup;
