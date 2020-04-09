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

let recentlyAccessed;
export const setRecentlyAccessed = coreChromeRecentlyAccessed =>
  (recentlyAccessed = coreChromeRecentlyAccessed);
export const getRecentlyAccessed = () => recentlyAccessed;

let docTitle;
export const setDocTitle = coreChromeDocTitle => (docTitle = coreChromeDocTitle);
export const getDocTitle = () => docTitle;

let mapsSaveCapabilities;
export const setSaveCapabilities = coreAppMapsSaveCapabilities =>
  (mapsSaveCapabilities = coreAppMapsSaveCapabilities);
export const getSaveCapabilities = () => mapsSaveCapabilities;
