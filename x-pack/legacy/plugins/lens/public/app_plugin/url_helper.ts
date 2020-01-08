/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DashboardConstants } from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard';

const EMPTY_DASHBOARD_PATTERN = /(.*#\/dashboard\?)(.*)/;
const DASHBOARD_WITH_ID_PATTERN = /(.*#\/dashboard\/.*\?)(.*)/;

/** *
 * Returns base path from dashboard url
 * eg.
 * input: http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!(),fullScreenMode:!f,options:(hidePanelTitles:!f,useMargins:!t),panels:!(),query:(language:kuery,query:''),timeRestore:!f,title:'',viewMode:edit)
 * output: http://localhost:5601/lib/app/kibana#
 * @param url
 */
export function getKibanaBasePathFromDashboardUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  let regex = RegExp(/(.*)(\/dashboard\?)/).exec(url);
  if (regex) {
    return regex[1];
  }
  regex = RegExp(/(.*)(\/dashboard)/).exec(url);
  if (regex) {
    return regex[1];
  }
  return null;
}

/**
 * Returns dashboard url with given query params. If query params already exist in the url, they will be replaced
 * eg.
 * input: http://localhost:5601/lib/app/kibana#/dashboard, {_a: {...}, _g: {...}}
 * output: http://localhost:5601/lib/app/kibana#/dashboard??_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(description:'',filters:!(),fullScreenMode:!f,options:(hidePanelTitles:!f,useMargins:!t),panels:!(),query:(language:kuery,query:''),timeRestore:!f,title:'',viewMode:edit)
 * @param absoluteUrl dashboard absolute url
 * @param urlParams query params to append to the url
 */
export function getDashboardUrlWithQueryParams(
  absoluteUrl: string,
  urlParams: Record<string, string>
): string {
  let dashboardUrl = getUrlWithoutQueryParams(absoluteUrl);
  if (!dashboardUrl) {
    return absoluteUrl;
  }
  dashboardUrl += '?';
  const keys = Object.keys(urlParams).sort();
  keys.forEach((key, index) => {
    dashboardUrl += `${key}=${urlParams[key]}`;
    if (index !== keys.length - 1) {
      dashboardUrl += '&';
    }
  });
  return dashboardUrl;
}

export function getUrlVars(url: string): Record<string, string> {
  const vars: Record<string, string> = {};
  // @ts-ignore
  url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(_, key, value) {
    vars[key] = value;
  });
  return vars;
}

/** *
 * Returns dashboard URL with added embeddableType and embeddableId query params
 * eg.
 * input: url: http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now)), embeddableId: 12345, embeddableType: 'lens'
 * output: http://localhost:5601/lib/app/kibana#dashboard?addEmbeddableType=lens&addEmbeddableId=12345&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
 * @param url dasbhoard absolute url
 * @param embeddableId id of the saved visualization
 * @param embeddableType 'lens' or 'visualization'
 */
export function addEmbeddableToDashboardUrl(
  url: string | undefined,
  embeddableId: string,
  embeddableType: 'lens'
): string | null {
  if (!url) {
    return null;
  }
  let regex = RegExp(EMPTY_DASHBOARD_PATTERN).exec(url); // check for empty dashboard first
  regex = regex || RegExp(DASHBOARD_WITH_ID_PATTERN).exec(url); // check for dashboard with id if not empty
  if (!regex) {
    return null;
  }
  const base = regex[1];
  const dashboardState = regex[2];
  return `${base}${DashboardConstants.ADD_EMBEDDABLE_TYPE}=${embeddableType}&${DashboardConstants.ADD_EMBEDDABLE_ID}=${embeddableId}&${dashboardState}`;
}

/**
 * Returns the portion of the URL without query params
 * eg.
 * input: http://localhost:5601/lib/app/kibana#/dashboard?param1=x&param2=y&param3=z
 * output:http://localhost:5601/lib/app/kibana#/dashboard
 * input: http://localhost:5601/lib/app/kibana#/dashboard/39292992?param1=x&param2=y&param3=z
 * output: http://localhost:5601/lib/app/kibana#/dashboard/39292992
 * @param url dashboard absolute url
 */
function getUrlWithoutQueryParams(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  return url.split('?')[0];
}
