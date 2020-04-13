/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let indexPatternService;
export const setIndexPatternService = dataIndexPatterns =>
  (indexPatternService = dataIndexPatterns);
export const getIndexPatternService = () => indexPatternService;

let inspector;
export const setInspector = newInspector => (inspector = newInspector);
export const getInspector = () => {
  return inspector;
};

let getInjectedVar;
export const setInjectedVarFunc = getInjectedVarFunc => (getInjectedVar = getInjectedVarFunc);
export const getInjectedVarFunc = () => getInjectedVar;

let indexPatternSelectComponent;
export const setIndexPatternSelect = indexPatternSelect =>
  (indexPatternSelectComponent = indexPatternSelect);
export const getIndexPatternSelectComponent = () => indexPatternSelectComponent;

let dataTimeFilter;
export const setTimeFilter = timeFilter => (dataTimeFilter = timeFilter);
export const getTimeFilter = () => dataTimeFilter;

let savedObjectsClient;
export const setSavedObjectsClient = coreSavedObjectsClient =>
  (savedObjectsClient = coreSavedObjectsClient);
export const getSavedObjectsClient = () => savedObjectsClient;

let chrome;
export const setCoreChrome = coreChrome => (chrome = coreChrome);
export const getCoreChrome = () => chrome;

let mapsCapabilities;
export const setMapsCapabilities = coreAppMapsCapabilities =>
  (mapsCapabilities = coreAppMapsCapabilities);
export const getMapsCapabilities = () => mapsCapabilities;

let visualizations;
export const setVisualizations = visPlugin => (visualizations = visPlugin);
export const getVisualizations = () => visualizations;

let docLinks;
export const setDocLinks = coreDocLinks => (docLinks = coreDocLinks);
export const getDocLinks = () => docLinks;

let uiSettings;
export const setUiSettings = coreUiSettings => (uiSettings = coreUiSettings);
export const getUiSettings = () => uiSettings;

let overlays;
export const setCoreOverlays = coreOverlays => (overlays = coreOverlays);
export const getCoreOverlays = () => overlays;

let data;
export const setData = dataPlugin => (data = dataPlugin);
export const getData = () => data;

let coreHttp;
export const setHttp = http => (coreHttp = http);
export const getHttp = () => coreHttp;

let uiActions;
export const setUiActions = pluginUiActions => (uiActions = pluginUiActions);
export const getUiActions = () => uiActions;

let core;
export const setCore = kibanaCore => (core = kibanaCore);
export const getCore = () => core;

let navigation;
export const setNavigation = pluginNavigation => (navigation = pluginNavigation);
export const getNavigation = () => navigation;

let coreI18n;
export const setCoreI18n = kibanaCoreI18n => (coreI18n = kibanaCoreI18n);
export const getCoreI18n = () => coreI18n;
