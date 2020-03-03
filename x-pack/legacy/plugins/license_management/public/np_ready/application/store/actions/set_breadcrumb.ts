/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ThunkAction } from 'redux-thunk';
import { ChromeStart } from 'src/core/public';
import { getDashboardBreadcrumbs, getUploadBreadcrumbs, Breadcrumb } from '../../breadcrumbs';

export const setBreadcrumb = (
  section: 'dashboard' | 'upload'
): ThunkAction<any, any, { chrome: ChromeStart; MANAGEMENT_BREADCRUMB: Breadcrumb }, any> => (
  dispatch,
  getState,
  { chrome, MANAGEMENT_BREADCRUMB }
) => {
  if (section === 'upload') {
    chrome.setBreadcrumbs(getUploadBreadcrumbs(MANAGEMENT_BREADCRUMB));
  } else {
    chrome.setBreadcrumbs(getDashboardBreadcrumbs(MANAGEMENT_BREADCRUMB));
  }
};
