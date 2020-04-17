/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from '../np_imports/ui/chrome';

export function getSafeForExternalLink(url: string) {
  const $injector = chrome.dangerouslyGetActiveInjector() as any;
  const globalState = $injector.get('globalState');
  if (url.startsWith('#/') && globalState.cluster_uuid) {
    const clusterUuid = globalState.ccs
      ? `${globalState.ccs}:${globalState.cluster_uuid}`
      : globalState.cluster_uuid;
    return `#/_cluster/${clusterUuid}/${url.substr(2)}`;
  }
  return url;
}
