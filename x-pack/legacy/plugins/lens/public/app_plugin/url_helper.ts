/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export function addLensToDashboardUrl(url: string | undefined, id: string): string | null {
  if (!url) {
    return null;
  }
  const regex = RegExp(/(.*#\/dashboard\?)(.*)/).exec(url);
  if (!regex) {
    return null;
  }
  const base = regex[1];
  const params = regex[2];
  const addLensParam = `addLens=${id}&`;
  return `${base}${addLensParam}${params}`;
}

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
  const regex = RegExp(/(.*)(\/dashboard\?)/).exec(url);
  if (regex) {
    return regex[1];
  }
  return null;
}
