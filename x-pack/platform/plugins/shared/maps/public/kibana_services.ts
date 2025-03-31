/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { EMSSettings } from '@kbn/maps-ems-plugin/common/ems_settings';
import { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import { BehaviorSubject } from 'rxjs';
import {
  EMS_DARKMAP_BOREALIS_ID,
  EMS_ROADMAP_BOREALIS_DESATURATED_ID,
} from '@kbn/maps-ems-plugin/common';
import type { MapsConfigType } from '../server/config';
import type { MapsPluginStartDependencies } from './plugin';

const servicesReady$ = new BehaviorSubject(false);
export const untilPluginStartServicesReady = () => {
  if (servicesReady$.value) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const subscription = servicesReady$.subscribe((isInitialized) => {
      if (isInitialized) {
        subscription.unsubscribe();
        resolve();
      }
    });
  });
};

let isDarkMode = false;
let coreStart: CoreStart;
let pluginsStart: MapsPluginStartDependencies;
let mapsEms: MapsEmsPluginPublicStart;
let emsSettings: EMSSettings;
export function setStartServices(core: CoreStart, plugins: MapsPluginStartDependencies) {
  coreStart = core;
  pluginsStart = plugins;
  mapsEms = plugins.mapsEms;
  emsSettings = mapsEms.createEMSSettings();

  core.theme.theme$.subscribe(({ darkMode }) => {
    isDarkMode = darkMode;
  });

  servicesReady$.next(true);
}

let isCloudEnabled = false;
export function setIsCloudEnabled(enabled: boolean) {
  isCloudEnabled = enabled;
}
export const getIsCloud = () => isCloudEnabled;

let spaceId = 'default';
export const getSpaceId = () => spaceId;
export const setSpaceId = (_spaceId: string) => {
  spaceId = _spaceId;
};

export const getIndexNameFormComponent = () => pluginsStart.fileUpload.IndexNameFormComponent;
export const getFileUploadComponent = () => pluginsStart.fileUpload.FileUploadComponent;
export const getIndexPatternService = () => pluginsStart.data.dataViews;
export const getAutocompleteService = () => pluginsStart.unifiedSearch.autocomplete;
export const getInspector = () => pluginsStart.inspector;
export const getFileUpload = () => pluginsStart.fileUpload;
export const getUiSettings = () => coreStart.uiSettings;
export const getIsDarkMode = () => isDarkMode;
export const getIndexPatternSelectComponent = () =>
  pluginsStart.unifiedSearch.ui.IndexPatternSelect;
export const getSearchBar = () => pluginsStart.unifiedSearch.ui.SearchBar;
export const getHttp = () => coreStart.http;
export const getExecutionContextService = () => coreStart.executionContext;
export const getTimeFilter = () => pluginsStart.data.query.timefilter.timefilter;
export const getToasts = () => coreStart.notifications.toasts;
export const getCoreChrome = () => coreStart.chrome;
export const getDevToolsCapabilities = () => coreStart.application.capabilities.dev_tools;
export const getMapsCapabilities = () => coreStart.application.capabilities.maps_v2;
export const getVisualizeCapabilities = () => coreStart.application.capabilities.visualize_v2;
export const getDocLinks = () => coreStart.docLinks;
export const getCoreOverlays = () => coreStart.overlays;
export const getCharts = () => pluginsStart.charts;
export const getData = () => pluginsStart.data;
export const getUiActions = () => pluginsStart.uiActions;
export const getCore = () => coreStart;
export const getNavigation = () => pluginsStart.navigation;
export const getCoreI18n = () => coreStart.i18n;
export const getAnalytics = () => coreStart.analytics;
export const getSearchService = () => pluginsStart.data.search;
export const getEmbeddableService = () => pluginsStart.embeddable;
export const getNavigateToApp = () => coreStart.application.navigateToApp;
export const getUrlForApp = () => coreStart.application.getUrlForApp;
export const getNavigateToUrl = () => coreStart.application.navigateToUrl;
export const getSavedObjectsTagging = () => pluginsStart.savedObjectsTagging;
export const getSpacesApi = () => pluginsStart.spaces;
export const getTheme = () => coreStart.theme;
export const getApplication = () => coreStart.application;
export const getUsageCollection = () => pluginsStart.usageCollection;
export const getContentManagement = () => pluginsStart.contentManagement;
export const isScreenshotMode = () => {
  return pluginsStart.screenshotMode ? pluginsStart.screenshotMode.isScreenshotMode() : false;
};
export const getServerless = () => pluginsStart.serverless;
export const getEmbeddableEnhanced = () => pluginsStart.embeddableEnhanced;

// xpack.maps.* kibana.yml settings from this plugin
let mapAppConfig: MapsConfigType;
export const setMapAppConfig = (config: MapsConfigType) => (mapAppConfig = config);
export const getMapAppConfig = () => mapAppConfig;

export const getShowMapsInspectorAdapter = () => getMapAppConfig().showMapsInspectorAdapter;
export const getPreserveDrawingBuffer = () => getMapAppConfig().preserveDrawingBuffer;

export const getMapsEmsStart: () => MapsEmsPluginPublicStart = () => {
  return mapsEms;
};

export const getEMSSettings: () => EMSSettings = () => {
  return emsSettings;
};

export const getEmsTileLayerId = () => {
  // To be updated unce Borealis is the only theme available
  if (coreStart.theme.getTheme().name !== 'borealis') {
    return mapsEms.config.emsTileLayerId;
  } else {
    return {
      ...mapsEms.config.emsTileLayerId,
      dark: EMS_DARKMAP_BOREALIS_ID,
      desaturated: EMS_ROADMAP_BOREALIS_DESATURATED_ID,
    };
  }
};

export const getShareService = () => pluginsStart.share;
