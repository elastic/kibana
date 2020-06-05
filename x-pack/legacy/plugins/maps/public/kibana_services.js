/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { esFilters, search } from '../../../../../src/plugins/data/public';
const { getRequestInspectorStats, getResponseInspectorStats } = search;

export const SPATIAL_FILTER_TYPE = esFilters.FILTERS.SPATIAL_FILTER;
export { SearchSource } from '../../../../../src/plugins/data/public';

let indexPatternService;
export const setIndexPatternService = (dataIndexPatterns) =>
  (indexPatternService = dataIndexPatterns);
export const getIndexPatternService = () => indexPatternService;

let autocompleteService;
export const setAutocompleteService = (dataAutoComplete) =>
  (autocompleteService = dataAutoComplete);
export const getAutocompleteService = () => autocompleteService;

let licenseId;
export const setLicenseId = (latestLicenseId) => (licenseId = latestLicenseId);
export const getLicenseId = () => {
  return licenseId;
};

let inspector;
export const setInspector = (newInspector) => (inspector = newInspector);
export const getInspector = () => {
  return inspector;
};

let fileUploadPlugin;
export const setFileUpload = (fileUpload) => (fileUploadPlugin = fileUpload);
export const getFileUploadComponent = () => {
  return fileUploadPlugin.JsonUploadAndParse;
};

let getInjectedVar;
export const setInjectedVarFunc = (getInjectedVarFunc) => (getInjectedVar = getInjectedVarFunc);
export const getInjectedVarFunc = () => getInjectedVar;

let uiSettings;
export const setUiSettings = (coreUiSettings) => (uiSettings = coreUiSettings);
export const getUiSettings = () => uiSettings;

let indexPatternSelectComponent;
export const setIndexPatternSelect = (indexPatternSelect) =>
  (indexPatternSelectComponent = indexPatternSelect);
export const getIndexPatternSelectComponent = () => indexPatternSelectComponent;

let coreHttp;
export const setHttp = (http) => (coreHttp = http);
export const getHttp = () => coreHttp;

let dataTimeFilter;
export const setTimeFilter = (timeFilter) => (dataTimeFilter = timeFilter);
export const getTimeFilter = () => dataTimeFilter;

let toast;
export const setToasts = (notificationToast) => (toast = notificationToast);
export const getToasts = () => toast;

export async function fetchSearchSourceAndRecordWithInspector({
  searchSource,
  requestId,
  requestName,
  requestDesc,
  inspectorAdapters,
  abortSignal,
}) {
  const inspectorRequest = inspectorAdapters.requests.start(requestName, {
    id: requestId,
    description: requestDesc,
  });
  let resp;
  try {
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then((body) => {
      inspectorRequest.json(body);
    });
    resp = await searchSource.fetch({ abortSignal });
    inspectorRequest.stats(getResponseInspectorStats(searchSource, resp)).ok({ json: resp });
  } catch (error) {
    inspectorRequest.error({ error });
    throw error;
  }

  return resp;
}
