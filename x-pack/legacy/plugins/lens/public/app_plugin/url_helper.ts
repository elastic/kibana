/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DashboardConstants } from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard';

const EMPTY_DASHBOARD_PATTERN = /(.*#\/dashboard\?)(.*)/;
const DASHBOARD_WITH_ID_PATTERN = /(.*#\/dashboard\/.*\?)(.*)/;
const TIME_PATTERN_1 = /(.*)(,time:[^)]+\))(.*)/;
const TIME_PATTERN_2 = /(.*)(time:[^)]+\),)(.*)/; // same as TIME_PATTERN_1, but comma follows, not preceeds

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
 * Returns dashboard URL without time parameter
 * eg.
 * input: http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
 * output: http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0))
 * @param url dashboard absolute url
 */
export function getDashboardUrlWithoutTime(url: string | undefined): string {
  if (!url) {
    return null;
  }
  let regex = RegExp(TIME_PATTERN_1).exec(url);
  regex = regex || RegExp(TIME_PATTERN_2).exec(url);
  if (regex) {
    return `${regex[1]}${regex[3]}`;
  }
  return url;
}
